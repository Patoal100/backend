"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const https_1 = tslib_1.__importDefault(require("https"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const login_js_1 = require("./authentication/login.js");
const parametros_js_1 = require("./config/parametros.js");
const iot_js_1 = require("./iot/iot.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || parametros_js_1.Configuration.node.port;
app.use(express_1.default.json());
app.use(login_js_1.LOGIN_API);
app.use(iot_js_1.IOT_API);
if (parametros_js_1.Configuration.https.enabled) {
    https_1.default.createServer({
        cert: fs_1.default.readFileSync(parametros_js_1.Configuration.https.cert),
        key: fs_1.default.readFileSync(parametros_js_1.Configuration.https.key)
    }, app)
        .listen(PORT, () => {
        console.log(`Server Up port with ssl ${PORT}`);
    });
}
else {
    app.listen(PORT, () => {
        console.log(`Server Up port ${PORT}`);
    });
}
//# sourceMappingURL=index.js.map