import express from 'express';
import https from 'https';
import fs from 'fs';
import { LOGIN_API } from './authentication/login.js';
import { Configuration } from './config/parametros.js';

const app = express();
const PORT = process.env.PORT || Configuration.node.port;
app.use(express.json());

app.use(LOGIN_API);

if (Configuration.https.enabled) {

    https.createServer(
        {
            cert: fs.readFileSync(Configuration.https.cert),
            key: fs.readFileSync(Configuration.https.key)
        }, app)
        .listen(PORT, () => {
            console.log(`Server Up port with ssl ${PORT}`);
        });

} else {

    app.listen(PORT, () => {
        console.log(`Server Up port ${PORT}`);
    });

}