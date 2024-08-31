"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IOT_API = void 0;
const tslib_1 = require("tslib");
const express_1 = require("express");
const cors_1 = tslib_1.__importDefault(require("cors"));
const iot_service_1 = require("./iot.service");
const IOT_API = (0, express_1.Router)();
exports.IOT_API = IOT_API;
const iotService = new iot_service_1.IotService();
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
    const filePath = '/home/pato/Tesis/backend/ModeloP.MonitorIoT';
    try {
        const jsonData = yield iotService.transformXmiToJson(filePath);
        const iot_services = yield iotService.getIotServices(jsonData, data);
        res.status(200).json(iot_services);
    }
    catch (error) {
        res.status(500).send({ error: error.message });
    }
}));
//# sourceMappingURL=iot.js.map