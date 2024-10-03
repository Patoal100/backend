"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IOT_API = void 0;
const tslib_1 = require("tslib");
const express_1 = require("express");
const cors_1 = tslib_1.__importDefault(require("cors"));
const iot_service_1 = require("./iot.service");
// import { LoginService } from "../authentication/login.service";
const parametros_1 = require("../config/parametros");
const IOT_API = (0, express_1.Router)();
exports.IOT_API = IOT_API;
const iotService = new iot_service_1.IotService();
// const loginService = new LoginService();
IOT_API.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});
IOT_API.use((0, cors_1.default)({
    origin: '*'
}));
IOT_API.get('/iot', (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    res.status(200).send("IOT API");
}));
IOT_API.post('/service/client_services', (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    console.log(data);
    // const authHeader = req.headers['authorization'];
    // const token = authHeader;
    try {
        // if (!token) {
        //     return res.status(401).send({ error: 'No token provided' });
        // }
        // try {
        //     const decoded = await loginService.validateToken(token);
        //     if (!decoded) {
        //         return res.status(401).send({ error: 'Invalid token' });
        //     }
        // } catch (error) {
        //     return res.status(401).send({ error: 'Invalid token' });
        // }
        const jsonData = yield iotService.transformXmiToJson(parametros_1.Configuration.model_path);
        const iot_services = yield iotService.getIotServices(jsonData, data);
        res.status(200).json(iot_services);
    }
    catch (error) {
        res.status(500).send({ error: error.message });
    }
}));
IOT_API.get('/api/hierarchy', (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    try {
        const hierarchy = yield iotService.getHierarchy();
        res.status(200).json(hierarchy);
    }
    catch (error) {
        res.status(500).send({ error: error.message });
    }
}));
//# sourceMappingURL=iot.js.map