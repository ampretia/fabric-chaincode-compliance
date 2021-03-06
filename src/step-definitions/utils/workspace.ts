import { Feature, Global } from '../../interfaces/interfaces';
import { Network } from '../../network/network';
import { Logger } from '../../utils/logger';

const logger = Logger.getLogger('./src/step-definitions/utils/workspace.ts');

declare const global: Global;

interface ChaincodeConfig {
    policy: string;
    collection: string;
}

export class Workspace {

    public network: Network;
    public language: string;
    public chaincodes: Map<string, ChaincodeConfig>;
    public feature: Feature;

    public constructor() {
        this.network = global.CURRENT_NETWORK;
        this.language = global.CHAINCODE_LANGUAGE;
        this.chaincodes = new Map();
    }

    public updateChaincodePolicy(chaincode: string, policy: string) {
        logger.debug(`Setting endorsement policy for ${chaincode} to:`, policy);

        const config = this.getConfig(chaincode);
        config.policy = policy;

        this.chaincodes.set(chaincode, config);
    }

    public updateChaincodeCollection(chaincode: string, collection: string) {
        logger.debug(`Setting private collection for ${chaincode} to:`, collection);

        const config = this.getConfig(chaincode);
        config.collection = collection;

        this.chaincodes.set(chaincode, config);
    }

    private getConfig(chaincodeName: string) {
        let config: ChaincodeConfig = {
            collection: null,
            policy: null,
        };

        if (this.chaincodes.has(chaincodeName)) {
            config = this.chaincodes.get(chaincodeName);
        }

        return config;
    }
}
