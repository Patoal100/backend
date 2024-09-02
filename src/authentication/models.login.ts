export interface USERI{
    id: number;
    name: string;
    last_name: string;
    login: string;
    password: string;
    role: string;
    disability: string;
}

export interface USER_LOGIN{
    ok: boolean;
    user: USERI;
}
