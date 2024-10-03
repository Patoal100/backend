import { Pool } from 'pg';
import { Configuration } from '../config/parametros';
import  fs from 'fs';
import { promisify } from 'util';
import { parseStringPromise } from 'xml2js';
import { IotRequest, MdnsService, SensorInfo} from './models.iot';
import * as crypto from 'crypto';

const coneccion_bd = new Pool(Configuration.database);
const readFile = promisify(fs.readFile);

export class IotService {
  
    async transformXmiToJson(filePath: string): Promise<any> {
        try {
        const xmiData = await readFile(filePath, 'utf-8');
        const jsonData = await parseStringPromise(xmiData);

        const firstLevelKeys = Object.keys(jsonData);
        return jsonData[firstLevelKeys[0]]['containsEntity'][0];
        } catch (error) {
        throw new Error('Error al transformar el archivo XMI a JSON: ' + error.message);
        }
    }
    
    
    async getSensorInfo(filePath: string, sensor: string): Promise<SensorInfo[]> {
        try {
            const content = await readFile(filePath, 'utf-8');
            const sensorInfo: SensorInfo = {};
            const regex = new RegExp(`<.*?name=".*?${sensor}.*?".*?>`, 'g');
            let match;

            while ((match = regex.exec(content)) !== null) {
                const matchedString = match[0];
                const nameMatch = matchedString.match(/name="(.*?)"/);
                const name = nameMatch ? nameMatch[1] : '';

                if (matchedString.includes('xsi:type="MonitorIoT:API"')) {
                    sensorInfo.apiService = name;
                } else if (matchedString.includes('xsi:type="MonitorIoT:Actuator"')) {
                    sensorInfo.actuatorNode = name;
                } else if (matchedString.includes('<hasProperty')) {
                    sensorInfo.property = name;
                }
            }

            return [sensorInfo];
        } catch (error) {
            throw new Error('Error al leer el archivo: ' + error.message);
        }
    }

    findEntityWithPath(jsonData: any, entityName: string, path: string = ''): any {
        if (jsonData['$'] && jsonData['$'].name === entityName) {
            return {entity: jsonData, path: path + entityName};
        }

        if (jsonData['containsSubPhysicalEntity']) {
            for (const subEntity of jsonData['containsSubPhysicalEntity']) {
                const result = this.findEntityWithPath(subEntity, entityName, path + (jsonData['$']?.name ? jsonData['$'].name + '/' : ''));
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


    findEntityByPath(jsonData: any, path: string): any {
        const levels = path.split('/');
        const lastLevel = levels[levels.length - 1];
        const entityType = lastLevel.split(':')[0];
        return this.findEntityWithPath(jsonData, entityType);
    }

    parseRoute(route: string): { entity: string, name: string }[] {
        return route.split('/').map(level => {
            const [entity, name] = level.split(':');
            return { entity, name };
        });
    }
    async saveHierearchy(route: string): Promise<void> {
        const levels = this.parseRoute(route);
        let parent_id = null;
        let accumulatedRoute = '';

        
        for (const level of levels) {
            accumulatedRoute += (accumulatedRoute ? '/' : '') + level.entity + ':' + level.name;
            // Calcular el hash de la variable route
            const hash = crypto.createHash('sha256').update(accumulatedRoute).digest('hex').substring(0,16);
            const query = {
                text: `
                    INSERT INTO hierarchy (entity, name, parent_id, hash)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (entity, name) DO UPDATE
                    SET entity = $1, name = $2, hash = $4
                    RETURNING id
                `,
                values: [level.entity, level.name, parent_id, hash]
            };

            try {
                const result = await coneccion_bd.query(query);
                parent_id = result.rows[0].id;
            } catch (error) {
                console.error('Error al guardar la jerarquía:', error);
                throw error;
            }
        }
        
    }

    transformRoute(route: string): string {
        return route.split('/').map(part => part.split(':')[0]).join('/');
    }

    async getIotServices(jsonData: any, iot: IotRequest): Promise<IotRequest> {
        const iot_services = iot.mdns_services;
        const iotServices:IotRequest = {
            mdns_services: [],
            token: iot.token,
            last_location: iot.last_location,
            timestamp: ''
        };
        for (const service of iot_services) {
            const route = service.txtProperties.location;
            const type = service.txtProperties.type;
            const entity = this.findEntityByPath(jsonData, route);
            const hash = crypto.createHash('sha256').update(route).digest('hex').substring(0,16);
            
            const modelRoute = this.transformRoute(route);

            if (entity && entity.path === modelRoute) {
                await this.saveHierearchy(route);
                const computingNodes = entity.entity['containsComputingNode'] || [];
                for (const node of computingNodes) {
                    if (node['$'] && node['$'].name === type) {
                        // Insertar en la base de datos
                        const query = {
                            text: `
                                INSERT INTO mdns_services (hash_id, address, service_type, port, mdns_name, location, type, hash)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                                ON CONFLICT (hash_id) DO UPDATE
                                SET address = EXCLUDED.address,
                                    service_type = EXCLUDED.service_type,
                                    port = EXCLUDED.port,
                                    mdns_name = EXCLUDED.mdns_name,
                                    location = EXCLUDED.location,
                                    type = EXCLUDED.type,
                                    hash = EXCLUDED.hash
                            `,
                            values: [
                                service.hashId,
                                service.address,
                                service.serviceType,
                                service.port,
                                service.mdnsName,
                                service.txtProperties.location,
                                service.txtProperties.type,
                                hash
                            ]
                        };
                        coneccion_bd.query(query).then(() => {
                            console.log('Se agrego el servicio con id : ',service.hashId);
                        }).catch((error) => {
                            console.log('Error al insertar en la base de datos: ' + error.message);
                        });
                    }
                }
            }
        }

        iotServices.mdns_services = await this.getIotServicesByLocation(iot.last_location);
        return iotServices;

    }

async getIotServicesByLocation(location: string): Promise<MdnsService[]> {
    const query = {
        text: 'SELECT * FROM mdns_services WHERE hash = $1',
        values: [location]
    };

    try {
        const result = await coneccion_bd.query(query);
        const mdnsServices: MdnsService[] = await Promise.all(result.rows.map(async (row: any) => {
            const sensorInfo = await this.getSensorInfo(Configuration.model_path, row.type);
            return {
                hashId: row.hash_id,
                address: row.address,
                serviceType: row.service_type,
                port: row.port,
                mdnsName: row.mdns_name,
                txtProperties: {
                    location: row.location,
                    type: row.type,
                },
                services: sensorInfo,
                isSynced: true
            };
        }));
        // Fetch services dynamically from the XML file for "Servidor"
        const servidorServices = await this.getServicesForNode('Servidor', Configuration.model_path);
        
        
        const servicesInfoList: SensorInfo[] = servidorServices.map(service => ({
            apiService: service.name,
            actuadorNode: 'Servidor',
            property: null
        }));

        mdnsServices.push({
            hashId: 'Servidor',
            address: Configuration.appConection.hostname,
            serviceType: 'http',
            port: Configuration.appConection.port,
            mdnsName: 'AplicacionAcademica',
            txtProperties: {
                location: 'Servidor:Servidor',
                type: 'Servidor',
            },
            services: servicesInfoList,
            isSynced: true
        });
        return mdnsServices;
    } catch (error) {
        console.error('Error al obtener los servicios MDNS:', error);
        throw error;
    }
}

async getHierarchy(): Promise<any> {
    const mdnsServicesQuery = {
        text: 'SELECT * FROM mdns_services'
    };

    try {
        const mdnsServicesResult = await coneccion_bd.query(mdnsServicesQuery);
        const mdnsServicesRows = mdnsServicesResult.rows;

        // Construir la jerarquía
        const hierarchy = await this.buildHierarchy(mdnsServicesRows);

        return hierarchy;
    } catch (error) {
        console.error('Error al obtener la jerarquía:', error);
        throw error;
    }
}

async buildHierarchy(mdnsServicesRows: any[]): Promise<any> {
    const root = { id: 'root', entity: 'root', name: 'root', childs: [], services: [] };
    const map = new Map<string, any>();

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

        const sensorInfo = await this.getSensorInfo(Configuration.model_path, row.type);
        currentNode.services = currentNode.services || [];
        currentNode.services.push({
            id: row.hash_id,
            address: row.address,
            port: row.port,
            type: row.type,
            service: sensorInfo,
        });
    }

    await this.addServidorNode(map, root);

    // Return the hierarchy starting from the root
    return root.childs.length > 0 ? root.childs[0] : null;
}
async getHierarchyPath(): Promise<string[]> {
    const query = `
        WITH RECURSIVE hierarchy_path AS (
            SELECT id, entity, name, parent_id
            FROM hierarchy
            WHERE parent_id IS NULL
            UNION ALL
            SELECT h.id, h.entity, h.name, h.parent_id
            FROM hierarchy h
            INNER JOIN hierarchy_path hp ON hp.id = h.parent_id
        )
        SELECT entity, name
        FROM hierarchy_path
        ORDER BY id;
    `;

    try {
        const result = await coneccion_bd.query(query);
        const path = result.rows.map(row => `${row.entity}:${row.name}`);
        return path;
    } catch (error) {
        console.error('Error al obtener la jerarquía:', error);
        throw error;
    }
}

async addServidorNode(map: Map<string, any>, root: any) {
    const hierarchyPath = await this.getHierarchyPath();
    const servidorLocationParts = hierarchyPath;
    let servidorNode = root;

    // Traverse the location to find the correct place for "Servidor"
    servidorLocationParts.forEach(part => {
        const [entity, name] = part.split(':');
        const key = `${entity}:${name}`;
        let childNode = map.get(key);

        if (!childNode) {
            childNode = { id: key, entity, name, childs: [] };
            map.set(key, childNode);
            servidorNode.childs.push(childNode);
        }

        servidorNode = childNode;
    });

    // Fetch services dynamically from the XML file for "Servidor"
    const servidorServices = await this.getServicesForNode('Servidor', Configuration.model_path);

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
            address: Configuration.appConection.hostname,
            port: Configuration.appConection.port
        });
    });
}


async getServicesForNode(nodeName: string, xmlFilePath: string): Promise<any[]> {
    try {
        // Read and parse the XML file
        const xmlData = await readFile(xmlFilePath, 'utf-8');
        const jsonData = await parseStringPromise(xmlData);

        const services: any[] = [];

        // Assuming the node you're looking for is part of "containsResource" or "containsComputingNode"
        const entities = jsonData['MonitorIoT:MonitoringArchitectureModel']['containsEntity'] || [];

        // Find the node and its services
        for (const entity of entities) {
            if (entity.containsComputingNode && entity.containsComputingNode.some((node: any) => node.$.name === nodeName)) {
                // Extract services within the node
                const computingNode = entity.containsComputingNode.find((node: any) => node.$.name === nodeName);
                const resourceServices = computingNode.containsResource || [];

                // Collect all services in the node
                resourceServices.forEach((resource: any) => {
                    if (resource.containsService) {
                        resource.containsService.forEach((service: any) => {
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
    } catch (error) {
        console.error('Error fetching services from XML:', error);
        throw error;
    }
}

}