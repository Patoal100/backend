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
    getSensorInfo(filePath, sensor) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const content = yield readFile(filePath, 'utf-8');
                const sensorInfo = {};
                const regex = new RegExp(`<.*?name=".*?${sensor}.*?".*?>`, 'g');
                let match;
                while ((match = regex.exec(content)) !== null) {
                    const matchedString = match[0];
                    const nameMatch = matchedString.match(/name="(.*?)"/);
                    const name = nameMatch ? nameMatch[1] : '';
                    if (matchedString.includes('xsi:type="MonitorIoT:API"')) {
                        sensorInfo.apiService = name;
                    }
                    else if (matchedString.includes('xsi:type="MonitorIoT:Actuator"')) {
                        sensorInfo.actuatorNode = name;
                    }
                    else if (matchedString.includes('xsi:type="MonitorIoT:Sensor"')) {
                        sensorInfo.sensorNode = name;
                    }
                    else if (matchedString.includes('<hasProperty')) {
                        sensorInfo.property = name;
                    }
                }
                return sensorInfo;
            }
            catch (error) {
                throw new Error('Error al leer el archivo: ' + error.message);
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
    parseRoute(route) {
        return route.split('/').map(level => {
            const [entity, name] = level.split(':');
            return { entity, name };
        });
    }
    saveHierearchy(route) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const levels = this.parseRoute(route);
            let parent_id = null;
            for (const level of levels) {
                const query = {
                    text: `
                    INSERT INTO hierarchy (entity, name, parent_id)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (entity, name) DO UPDATE
                    SET entity = $1, name = $2
                    RETURNING id
                `,
                    values: [level.entity, level.name, parent_id]
                };
                try {
                    const result = yield coneccion_bd.query(query);
                    parent_id = result.rows[0].id;
                }
                catch (error) {
                    console.error('Error al guardar la jerarquía:', error);
                    throw error;
                }
            }
        });
    }
    transformRoute(route) {
        return route.split('/').map(part => part.split(':')[0]).join('/');
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
                const modelRoute = this.transformRoute(route);
                if (entity && entity.path === modelRoute) {
                    yield this.saveHierearchy(route);
                    const computingNodes = entity.entity['containsComputingNode'] || [];
                    for (const node of computingNodes) {
                        if (node['$'] && node['$'].name === type) {
                            // Insertar en la base de datos
                            const query = {
                                text: `
                                INSERT INTO mdns_services (hash_id, address, service_type, port, mdns_name, location, type)
                                VALUES ($1, $2, $3, $4, $5, $6, $7)
                                ON CONFLICT (hash_id) DO UPDATE
                                SET address = EXCLUDED.address,
                                    service_type = EXCLUDED.service_type,
                                    port = EXCLUDED.port,
                                    mdns_name = EXCLUDED.mdns_name,
                                    location = EXCLUDED.location,
                                    type = EXCLUDED.type
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
                const mdnsServices = yield Promise.all(result.rows.map((row) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    const sensorInfo = yield this.getSensorInfo(parametros_1.Configuration.model_path, row.type);
                    return {
                        hashId: row.hash_id,
                        address: row.address,
                        serviceType: row.service_type,
                        port: row.port,
                        mdnsName: row.mdns_name,
                        txtProperties: {
                            location: row.location,
                            type: row.type,
                            services: sensorInfo
                        },
                        isSynced: true
                    };
                })));
                return mdnsServices;
            }
            catch (error) {
                console.error('Error al obtener los servicios MDNS:', error);
                throw error;
            }
        });
    }
    getHierarchy() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const mdnsServicesQuery = {
                text: 'SELECT * FROM mdns_services'
            };
            try {
                const mdnsServicesResult = yield coneccion_bd.query(mdnsServicesQuery);
                const mdnsServicesRows = mdnsServicesResult.rows;
                // Construir la jerarquía
                const hierarchy = yield this.buildHierarchy(mdnsServicesRows);
                return hierarchy;
            }
            catch (error) {
                console.error('Error al obtener la jerarquía:', error);
                throw error;
            }
        });
    }
    buildHierarchy(mdnsServicesRows) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const root = { id: 'root', entity: 'root', name: 'root', childs: [], services: [] };
            const map = new Map();
            // Add mdns_services to the hierarchy
            for (const row of mdnsServicesRows) {
                const locationParts = row.location.split('/');
                let currentNode = root;
                // Traverse the location path and build the hierarchy dynamically
                locationParts.forEach(part => {
                    const [entity, name] = part.split(':');
                    const key = `${entity}:${name}`;
                    let childNode = map.get(key);
                    if (!childNode) {
                        childNode = { id: key, entity, name, childs: [], services: [] };
                        map.set(key, childNode);
                        currentNode.childs.push(childNode);
                    }
                    currentNode = childNode;
                });
                const sensorInfo = yield this.getSensorInfo(parametros_1.Configuration.model_path, row.type);
                currentNode.services = currentNode.services || [];
                currentNode.services.push({
                    id: row.hash_id,
                    address: row.address,
                    port: row.port,
                    type: row.type,
                    service: sensorInfo.apiService,
                });
            }
            // Now, let's dynamically place the "Servidor" node based on its location
            const servidorLocationParts = ['CAMPUS:Campus Universidad del Azuay', 'Edificio: Administracion', 'Piso:3'];
            let servidorNode = root;
            // Traverse the location to find the correct place for "Servidor"
            servidorLocationParts.forEach(part => {
                const [entity, name] = part.split(':');
                const key = `${entity}:${name}`;
                let childNode = map.get(key);
                if (!childNode) {
                    childNode = { id: key, entity, name, childs: [], services: [] };
                    map.set(key, childNode);
                    servidorNode.childs.push(childNode);
                }
                servidorNode = childNode;
            });
            // Fetch services dynamically from the XML file for "Servidor"
            const servidorServices = yield this.getServicesForNode('Servidor', parametros_1.Configuration.model_path);
            // Add "Servidor" node under the correct location and assign its services
            let servidorChildNode = map.get('Servidor:Servidor');
            if (!servidorChildNode) {
                servidorChildNode = {
                    id: 'Servidor:Servidor',
                    entity: 'Servidor',
                    name: 'AplicacionAcademica',
                    childs: [],
                    services: []
                };
                servidorNode.childs.push(servidorChildNode);
                map.set('Servidor:Servidor', servidorChildNode);
            }
            // Add dynamically fetched services under the "Servidor" node
            servidorServices.forEach(service => {
                servidorChildNode.services.push({
                    id: service.id,
                    service: service.name,
                    address: parametros_1.Configuration.appConection.hostname,
                    port: parametros_1.Configuration.appConection.port
                });
            });
            // Return the hierarchy starting from the root
            return root.childs.length > 0 ? root.childs[0] : null;
        });
    }
    getServicesForNode(nodeName, xmlFilePath) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                // Read and parse the XML file
                const xmlData = yield readFile(xmlFilePath, 'utf-8');
                const jsonData = yield (0, xml2js_1.parseStringPromise)(xmlData);
                const services = [];
                // Assuming the node you're looking for is part of "containsResource" or "containsComputingNode"
                const entities = jsonData['MonitorIoT:MonitoringArchitectureModel']['containsEntity'] || [];
                // Find the node and its services
                for (const entity of entities) {
                    if (entity.containsComputingNode && entity.containsComputingNode.some((node) => node.$.name === nodeName)) {
                        // Extract services within the node
                        const computingNode = entity.containsComputingNode.find((node) => node.$.name === nodeName);
                        const resourceServices = computingNode.containsResource || [];
                        // Collect all services in the node
                        resourceServices.forEach((resource) => {
                            if (resource.containsService) {
                                resource.containsService.forEach((service) => {
                                    services.push({
                                        id: service.$.id,
                                        name: service.$.name
                                    });
                                });
                            }
                        });
                    }
                }
                return services;
            }
            catch (error) {
                console.error('Error fetching services from XML:', error);
                throw error;
            }
        });
    }
}
exports.IotService = IotService;
//# sourceMappingURL=iot.service.js.map