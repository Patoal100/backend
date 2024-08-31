"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginService = void 0;
const tslib_1 = require("tslib");
const pg_1 = require("pg");
// import * as http from 'http';
// import * as https from 'https';
const parametros_1 = require("../config/parametros");
const correo_service_1 = require("../correo/correo.service");
const bcrypt_1 = tslib_1.__importDefault(require("bcrypt"));
const jsonwebtoken_1 = tslib_1.__importDefault(require("jsonwebtoken"));
const coneccion_bd = new pg_1.Pool(parametros_1.Configuration.database);
// let httpModule;
// if (Configuration.https.enabled) {
//     httpModule = https;
// }else{
//     httpModule = http;
// }
class LoginService {
    constructor() {
        this.correoService = new correo_service_1.CorreoService();
    }
    login(login, password) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                try {
                    const query = {
                        text: 'SELECT * FROM public.usuario WHERE login = $1',
                        values: [login]
                    };
                    const result = yield coneccion_bd.query(query);
                    if (result.rows.length === 0) {
                        return reject({ error: 'Usuario no encontrado' });
                    }
                    const user = result.rows[0];
                    const isMatch = yield bcrypt_1.default.compare(password, user.password);
                    if (!isMatch) {
                        return reject({ error: 'Contraseña incorrecta' });
                    }
                    // Generar el token
                    const token = jsonwebtoken_1.default.sign({ email: user.login }, parametros_1.Configuration.codigo, { expiresIn: '1h' });
                    resolve({ ok: true, user, token });
                }
                catch (error) {
                    console.log(error);
                    reject({ error: 'Error al autenticar el usuario' });
                }
            }));
        });
    }
    register(user) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const response = {
                    ok: false,
                    user: ''
                };
                try {
                    const salt = yield bcrypt_1.default.genSalt(10);
                    const hashedPassword = yield bcrypt_1.default.hash(user.password, salt);
                    const query = {
                        text: 'INSERT INTO public.usuario (login, password, name, last_name, role, disability) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                        values: [user.login, hashedPassword, user.name, user.last_name, user.role, user.disability]
                    };
                    const result = yield coneccion_bd.query(query);
                    response.ok = true;
                    response.user = result.rows[0];
                    resolve(response);
                }
                catch (error) {
                    console.log(error);
                    response.ok = false;
                    response.user = '';
                }
                resolve(response);
                return;
            }));
        });
    }
    sendCorreo(request) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return this.correoService.sendCorreo(request);
        });
    }
}
exports.LoginService = LoginService;
//# sourceMappingURL=login.service.js.map