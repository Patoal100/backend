import { Router } from "express";
import cors from "cors";
import { IotService } from "./iot.service";
import { IotRequest} from "./models.iot";
// import { LoginService } from "../authentication/login.service";
import { Configuration } from "../config/parametros";

const IOT_API = Router();
const iotService = new IotService();
// const loginService = new LoginService();


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
        const jsonData = await iotService.transformXmiToJson(Configuration.model_path);
        const iot_services = await iotService.getIotServices(jsonData, data);
        res.status(200).json(iot_services);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

export {
    IOT_API
}