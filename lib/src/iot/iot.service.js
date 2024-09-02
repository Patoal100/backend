"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IotService = void 0;
const tslib_1 = require("tslib");
const pg_1 = require("pg");
const parametros_1 = require("../config/parametros");
const fs_1 = tslib_1.__importDefault(require("fs"));
const util_1 = require("util");
const xml2js_1 = require("xml2js");
const coneccion_bd = new pg_1.Pool(parametros_1.Configuration.database);
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
                            // Insertar en la base de datos
                            const query = {
                                text: `
                                INSERT INTO mdns_services (hash_id, address, service_type, port, mdns_name, location, type)
                                VALUES ($1, $2, $3, $4, $5, $6, $7)
                                ON CONFLICT (hash_id) DO NOTHING
                            `,
                                values: [
                                    service.hashId,
                                    service.address,
                                    service.serviceType,
                                    service.port,
                                    service.mdnsName,
                                    service.txtProperties.location,
                                    service.txtProperties.type
                                ]
                            };
                            coneccion_bd.query(query).then(() => {
                                console.log('Se agrego el servicio con id : ', service.hashId);
                            }).catch((error) => {
                                console.log('Error al insertar en la base de datos: ' + error.message);
                            });
                        }
                    }
                }
            }
            iotServices.mdns_services = yield this.getIotServicesByLocation(iot.last_location);
            return iotServices;
        });
    }
    getIotServicesByLocation(location) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const query = {
                text: 'SELECT * FROM mdns_services WHERE location = $1',
                values: [location]
            };
            try {
                const result = yield coneccion_bd.query(query);
                const mdnsServices = result.rows.map((row) => ({
                    hashId: row.hash_id,
                    address: row.address,
                    serviceType: row.service_type,
                    port: row.port,
                    mdnsName: row.mdns_name,
                    txtProperties: {
                        location: row.location,
                        type: row.type
                    },
                    isSynced: true
                }));
                return mdnsServices;
            }
            catch (error) {
                console.error('Error al obtener los servicios MDNS:', error);
                throw error;
            }
        });
    }
}
exports.IotService = IotService;
//# sourceMappingURL=iot.service.js.map