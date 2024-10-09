export interface TxtProperties {
    location: string;
    type: string;
    pageName: string;
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

export interface ConditionInfo {
    type: string;
    conector?: string;
    value?: string;
    belongsProperty?: string;
    operator?: string;
    belongsEntity1?: string;
    belongsEntity2?: string;
}


export interface RuleWithConditions {
    rule_name: string;
    conditions: ConditionInfo[];
}