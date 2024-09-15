"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendParametros = void 0;
const BackendParametros = {
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
    appConection: {
        hostname: 'www.uda.com',
        port: 8080
    },
    codigo: 'clave_segura',
    model_path: '/home/pato/Tesis/backend/ModeloP.MonitorIoT'
};
exports.BackendParametros = BackendParametros;
//# sourceMappingURL=uda.js.map