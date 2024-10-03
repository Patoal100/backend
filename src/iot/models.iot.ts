export interface TxtProperties {
    location: string;
    type: string;
}

export interface MdnsService {
    hashId: string;
    address: string;
    serviceType: string;
    port: number;
    mdnsName: string;
    txtProperties: TxtProperties;
    services?: SensorInfo[];
    isSynced: boolean;
}

export interface IotRequest {
    mdns_services: MdnsService[];
    token: string;
    last_location: string;
    timestamp: string;
}

export interface SensorInfo {
    apiService?: string;
    actuatorNode?: string;
    property?: string;
}