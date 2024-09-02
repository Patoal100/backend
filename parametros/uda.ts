import { Entidad } from "../src/config/models";

const BackendParametros: Entidad = {
    name: 'UDA',
    logo: 'logo.png',
    https: {
        enabled: false,
        key: '',
        cert: ''
    },
    database: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'egob1977',
        database: 'uda'
    },
    email: {
        user: '',
        host: '',
        port: 0,
        password: '',
        rejectUnauthorized: false
    },
    node: {
        hostname: 'localhost',
        port: 3000
    },
    codigo: 'clave_segura',
    model_path: '/home/pato/Tesis/backend/ModeloP.MonitorIoT'
}

export {
    BackendParametros
}