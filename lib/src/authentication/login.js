"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOGIN_API = void 0;
const tslib_1 = require("tslib");
// import { Configuration } from "../config/parametros";
const express_1 = require("express");
// import { Pool } from "pg";
const cors_1 = tslib_1.__importDefault(require("cors"));
const login_service_1 = require("./login.service");
// import { hostname } from "os";
const LOGIN_API = (0, express_1.Router)();
exports.LOGIN_API = LOGIN_API;
const loginService = new login_service_1.LoginService();
// const config = {
//     logo: Configuration.logo,
//     name: Configuration.name,
//     hostname: Configuration.node.hostname,
//     port: Configuration.node.port,
// }
// const coneccion_bd = new Pool(Configuration.database);
LOGIN_API.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});
LOGIN_API.use((0, cors_1.default)({
    origin: '*'
}));
LOGIN_API.post('/login/authenticate', (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    const login = data.login;
    const password = data.password;
    try {
        const result = yield loginService.login(login, password);
        res.status(200).send(result);
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: e });
    }
}));
LOGIN_API.post('/login/register', (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    try {
        const result = yield loginService.register(data);
        res.status(200).send(result);
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: e });
    }
}));
//# sourceMappingURL=login.js.map