import { Router } from "express";
import cors from "cors";
import { IotService } from "./iot.service";

const IOT_API = Router();
const iotService = new IotService();


IOT_API.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
})

IOT_API.use(cors({
    origin: '*'
}));

IOT_API.get('/iot', async (req, res) => {
    res.status(200).send("IOT API");
});

IOT_API.post('/iot/transform', async (req, res) => {
    const filePath = '/home/pato/Tesis/backend/ModeloP.MonitorIoT';

    try {
        const jsonData = await iotService.transformXmiToJson(filePath);
        const Centity = iotService.findEntityWithPath(jsonData, 'CAMPUS');
        const Aentity = iotService.findEntityWithPath(jsonData, 'Aula');
        res.status(200).json({ Centity, Aentity });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

export {
    IOT_API
}