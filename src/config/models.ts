export interface Entidad{
    name: string;
    logo: string;
    https: HTTPS_CONFIG;
    database: DATABASE_CONFIG;
    email: EMAIL_CONFIG;
    node: NODE_CONFIG;
    codigo: string;
    model_path: string;
}

export interface HTTPS_CONFIG{
    enabled: boolean;
    key: string;
    cert: string;
}

export interface DATABASE_CONFIG{
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

export interface EMAIL_CONFIG{
    user: string;
    host: string;
    port: number;
    password: string;
    rejectUnauthorized: boolean,
}

export interface NODE_CONFIG{
    hostname: string;
    port: number;
}
