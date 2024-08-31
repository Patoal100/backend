// import { Configuration } from '../config/parametros';
// import nodemailer from 'nodemailer';
import { REQUEST_SEND_CORREO, RESPONSE_SEND_CORREO } from './models.correo';

// const crendentialsEmail = Configuration.email;
// const transporter = nodemailer.createTransport({
//     // service: 'Gmail',
//     host: crendentialsEmail.host,
//     port: crendentialsEmail.port,
//     tls: {
//         secure: false,
//         ignoreTLS: true,
//         rejectUnauthorized: false,
//     },
//     secure: crendentialsEmail.port == 465 ? true : false,
//     auth: {
//         user: crendentialsEmail.user,
//         pass: crendentialsEmail.password
//     },
// });

export class CorreoService {

    sendCorreo(request: REQUEST_SEND_CORREO): Promise<RESPONSE_SEND_CORREO> {

        return new Promise(async (resolve) => {
            const response: RESPONSE_SEND_CORREO = {
                ok: false
            }


            // await transporter.sendMail({
            //     from: crendentialsEmail.user,
            //     to: request.to,
            //     subject: request.subject,
            //     text: request.text,
            //     html: request.html
            // }).catch((err: any) => {
            //     resolve(response);
            //     return;
            // })
            response.ok = true;
            resolve(response);
            return;
        });

    };
}

