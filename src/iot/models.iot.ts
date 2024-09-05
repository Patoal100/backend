export interface TxtProperties {
    location: string;
    type: string;
    services?: SensorInfo[];
}

export interface MdnsService {
    hashId: string;
    address: string;
    serviceType: string;
    port: number;
    mdnsName: string;
    txtProperties: TxtProperties;
    isSynced: boolean;
}

export interface IotRequest {
    mdns_services: MdnsService[];
    uid: number;
    last_location: string;
    timestamp: string;
}

export interface SensorInfo {
    apiService?: string;
    actuatorNode?: string;
    property?: string;
    sensorNode?: string;
}