import { FileSystemWallet } from 'fabric-network';
import { Network } from '../network/network';

export interface Org {
    name: string;
    cli: string;
    mspid: string;
    peers: Peer[];
    cas: CA[];
    wallet: FileSystemWallet;
    ccp: string;
}

export interface BaseComponent {
    name: string;
    port: number;
    externalPort: number;
}

// tslint:disable-next-line: no-empty-interface
export interface Orderer extends BaseComponent {
}

export interface Profile {
    organisations: Org[];
}

export interface Global extends NodeJS.Global {
    CHAINCODE_LANGUAGE: 'golang' | 'java' | 'node';
    CURRENT_NETWORK: Network;
}

export interface Channel {
    name: string;
    organisations: Org[];
}

// tslint:disable-next-line: no-empty-interface
export interface Peer extends BaseComponent {
    eventPort: number;
    externalEventPort: number;
}

// tslint:disable-next-line: no-empty-interface
export interface CA extends BaseComponent {
    trustedRootCert: string;
}