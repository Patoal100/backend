// import { Configuration } from "../config/parametros";
import { Router } from "express";
// import { Pool } from "pg";
import cors from "cors";
import { LoginService } from "./login.service";
import { USERI } from "./models.login";
// import { hostname } from "os";

const LOGIN_API = Router();
const loginService = new LoginService();

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
})

LOGIN_API.use(cors({
    origin: '*'
}));

LOGIN_API.post('/login/authenticate', async (req, res) => {
    const data = req.body;
    const login = data.login;
    const password = data.password;

    try {
        const result = await loginService.login(login, password);
        res.status(200).send(result);
    }
    catch (e) {
        console.log(e);
        res.status(500).json({ error: e });
    }
});

LOGIN_API.post('/login/register', async (req, res) => {
    const data: USERI = req.body;

    try{
        const result = await loginService.register(data);
        res.status(200).send(result);
    }catch(e){
        console.log(e);
        res.status(500).json({error: e});
    }
});


export {
    LOGIN_API
}