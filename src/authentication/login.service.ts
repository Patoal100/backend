import { USERI } from "./models.login";
import { Pool } from 'pg';
// import * as http from 'http';
// import * as https from 'https';
import { Configuration } from '../config/parametros';
import { CorreoService } from '../correo/correo.service';
import { REQUEST_SEND_CORREO } from "../correo/models.correo";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const coneccion_bd = new Pool(Configuration.database);

// let httpModule;

// if (Configuration.https.enabled) {
//     httpModule = https;
// }else{
//     httpModule = http;
// }


export class LoginService {
    private correoService: CorreoService = new CorreoService();


    async login(login: string, password: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
        try {
            const query = {
            text: 'SELECT * FROM public.usuario WHERE login = $1',
            values: [login]
            };
            const result = await coneccion_bd.query(query);

            if (result.rows.length === 0) {
                return reject({ error: 'Usuario no encontrado' });
            }

            const user: USERI = result.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return reject({ error: 'Contraseña incorrecta' });
            }

            // Generar el token
            const token = jwt.sign({ email: user.login }, Configuration.codigo, { expiresIn: '1h' });

            resolve({ ok: true, user, token });
        } catch (error) {
            console.log(error);
            reject({ error: 'Error al autenticar el usuario' });
        }
        });
    }

    async register(user: USERI): Promise<any> {
        return new Promise(async (resolve) => {
            const response = {
                ok: false,
                user: ''
            }

            try {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(user.password, salt);

                const query = {
                    text: 'INSERT INTO public.usuario (login, password, name, last_name, role, disability) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                    values: [user.login, hashedPassword, user.name, user.last_name, user.role, user.disability]
                };
                const result = await coneccion_bd.query(query);

                response.ok = true;
                response.user = result.rows[0];
                resolve(response);
            } catch (error) {
                console.log(error);
                response.ok = false;
                response.user = '';
            }

            resolve(response);
            return;
        });
    }

    async sendCorreo(request: REQUEST_SEND_CORREO): Promise<any> {
        return this.correoService.sendCorreo(request);
    }
}

