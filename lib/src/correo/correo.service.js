"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorreoService = void 0;
const tslib_1 = require("tslib");
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
class CorreoService {
    sendCorreo(request) {
        return new Promise((resolve) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const response = {
                ok: false
            };
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
        }));
    }
    ;
}
exports.CorreoService = CorreoService;
//# sourceMappingURL=correo.service.js.map