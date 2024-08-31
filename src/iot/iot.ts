import { Router } from "express";
import cors from "cors";
import { IotService } from "./iot.service";
import { IotRequest } from "./models.iot";

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

IOT_API.post('/service/client_services', async (req, res) => {
    const data: IotRequest = req.body;
    const filePath = '/home/pato/Tesis/backend/ModeloP.MonitorIoT';

    try {
        const jsonData = await iotService.transformXmiToJson(filePath);
        const iot_services = await iotService.getIotServices(jsonData, data);
        res.status(200).json(iot_services);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

export {
    IOT_API
}