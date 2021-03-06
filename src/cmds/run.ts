import * as chalk from 'chalk';
import * as cucumber from 'cucumber';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Arguments, Argv, CommandModule } from 'yargs';
import { Global } from '../interfaces/interfaces';
import { DEFINED_NETWORKS, Network } from '../network/network';
import { Logger } from '../utils/logger';
import { addExports } from './utils';

declare const global: Global;

const cucumberArgs = [
    'features/*.feature',
    '--require-module', 'ts-node/register',
    '--require', 'src/step-definitions/**/*.ts',
];

const dockerChaincodeFolder = path.join(__dirname, '../../resources/chaincode');
const logger = Logger.getLogger('./src/cmds/run.ts');

const options = {
    'chaincode-dir': {
        alias: 'd',
        description: 'Directory containing the chaincodes for testing',
        required: true,
        type: 'string',
    },
    'chaincode-override': {
        description: 'Override the default folder for a given chaincode format {<NAME>: <FOLDER>}',
        type: 'object',
    },
    language: {
        alias: 'l',
        choices: ['golang', 'java', 'node'],
        description: 'Language of chaincodes that will be used',
        required: true,
        type: 'string',
    },
    'logging-level': {
        choices: ['info', 'debug'],
        default: 'info',
        description: 'Set logging level',
    },
    tags: {
        description: 'Specific tags to run',
        type: 'string',
    },
};

const cmd: CommandModule = {
    builder: (yargs: Argv): Argv => {
        yargs.options(options);
        yargs.usage('fabric-chaincode-compliance');

        return yargs;
    },
    command: 'run [options]',
    desc: 'Run the compliance tests',
    handler: (args: Arguments): Arguments => {
        const chaincodeFolder = path.resolve(process.cwd(), args.chaincodeDir);
        global.CHAINCODE_LANGUAGE = args.language;
        global.LOGGING_LEVEL = args.loggingLevel;

        Logger.refreshLoggers();

        return args.thePromise = new Promise(async (resolve, reject) => {
            const cucumberErrors = [];

            for (const name of DEFINED_NETWORKS) {
                logger.info(chalk.cyan(`Creating network ${name}`));

                const network = new Network(name);
                global.CURRENT_NETWORK = network;

                try {
                    logger.debug(`Copying chaincode (${chaincodeFolder}) to docker chaincode folder`);

                    await fs.copy(chaincodeFolder, dockerChaincodeFolder);

                    if (args.chaincodeOverride) {
                        let overrides;
                        try {
                            overrides = JSON.parse(args.chaincodeOverride);
                        } catch (err) {
                            throw new Error('Option chaincode-override must be JSON');
                        }

                        for (const key in overrides) {
                            if (overrides.hasOwnProperty(key)) {
                                await fs.copy(path.resolve(process.cwd(), overrides[key]), path.join(dockerChaincodeFolder, key));
                            }
                        }
                    }

                    await network.build();
                } catch (err) {
                    reject(err);
                    return;
                }

                let argv = process.argv.slice(0, 2).concat(cucumberArgs).concat('--tags', `@${name}`).concat('--tags', `not @not-${args.language}`);

                if (args.tags) {
                    argv = argv.concat('--tags', args.tags);
                }

                const cli = new (cucumber as any).Cli({
                    argv,
                    cwd: process.cwd(),
                    stdout: {write: () => null},
                });

                logger.info(chalk.magenta('Running cucumber tests'));

                const requireKeys = Object.keys(require.cache);

                requireKeys.forEach((key) => {
                    if (key.includes('cucumber-tsflow') || key.includes('step-definitions')) {
                        delete require.cache[require.resolve(key)];
                    }
                });

                const resp = await cli.run();

                if (!resp.success) {
                    cucumberErrors.push(name);
                }

                logger.info(chalk.cyan(`Tearing down network ${name}`));

                await network.teardown();
                await fs.emptyDir(dockerChaincodeFolder);
                await fs.ensureFile(path.join(dockerChaincodeFolder, '.gitkeep'));
            }

            if (cucumberErrors.length > 0) {
                reject(new Error('Cucumber tests failed for networks: ' + cucumberErrors.join('\n')));
                return;
            }

            resolve();
        });
    },
};

addExports(exports, cmd);
