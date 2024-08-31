export interface REQUEST_SEND_CORREO {
    html: any;
    to: string | string[];
    subject: string;
    text: string;
    body: string;
    attachments?: any
}

export interface RESPONSE_SEND_CORREO {
    ok: boolean;
}