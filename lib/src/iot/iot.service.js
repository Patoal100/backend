"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IotService = void 0;
const tslib_1 = require("tslib");
// import { Pool } from 'pg';
// import { Configuration } from '../config/parametros';
const fs_1 = tslib_1.__importDefault(require("fs"));
const util_1 = require("util");
const xml2js_1 = require("xml2js");
// const coneccion_bd = new Pool(Configuration.database);
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
class IotService {
    transformXmiToJson(filePath) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const xmiData = yield readFile(filePath, 'utf-8');
                const jsonData = yield (0, xml2js_1.parseStringPromise)(xmiData);
                const firstLevelKeys = Object.keys(jsonData);
                return jsonData[firstLevelKeys[0]]['containsEntity'][0];
            }
            catch (error) {
                throw new Error('Error al transformar el archivo XMI a JSON: ' + error.message);
            }
        });
    }
    findEntityWithPath(jsonData, entityName, path = '') {
        var _a;
        if (jsonData['$'] && jsonData['$'].name === entityName) {
            return { entity: jsonData, path: path + entityName };
        }
        if (jsonData['containsSubPhysicalEntity']) {
            for (const subEntity of jsonData['containsSubPhysicalEntity']) {
                const result = this.findEntityWithPath(subEntity, entityName, path + (((_a = jsonData['$']) === null || _a === void 0 ? void 0 : _a.name) ? jsonData['$'].name + '/' : ''));
                if (result) {
                    return result;
                }
            }
        }
        // if (jsonData['containsComputingNode']) {
        //     for (const node of jsonData['containsComputingNode']) {
        //         const result = this.findEntity(node, entityName);
        //         if (result) {
        //             return result;
        //         }
        //     }
        // }
        return null;
    }
    findEntityByPath(jsonData, path) {
        const levels = path.split('/');
        const lastLevel = levels[levels.length - 1];
        const entityType = lastLevel.split(':')[0];
        return this.findEntityWithPath(jsonData, entityType);
    }
    getIotServices(jsonData, iot) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const iot_services = iot.mdns_services;
            const iotServices = {
                mdns_services: [],
                uid: 0,
                last_location: iot.last_location,
                timestamp: ''
            };
            for (const service of iot_services) {
                const route = service.txtProperties.location;
                const type = service.txtProperties.type;
                const entity = this.findEntityByPath(jsonData, route);
                if (entity && entity.path === route) {
                    const computingNodes = entity.entity['containsComputingNode'] || [];
                    for (const node of computingNodes) {
                        if (node['$'] && node['$'].name === type) {
                            iotServices.mdns_services.push({
                                hashId: service.hashId,
                                address: service.address,
                                serviceType: service.serviceType,
                                port: service.port,
                                mdnsName: service.mdnsName,
                                txtProperties: service.txtProperties,
                                isSynced: true
                            });
                        }
                    }
                }
            }
            return iotServices;
        });
    }
}
exports.IotService = IotService;
//# sourceMappingURL=iot.service.js.map