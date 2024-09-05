import { Pool } from 'pg';
import { Configuration } from '../config/parametros';
import  fs from 'fs';
import { promisify } from 'util';
import { parseStringPromise } from 'xml2js';
import { IotRequest, MdnsService, SensorInfo} from './models.iot';

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
    
    
    async getSensorInfo(filePath: string, sensor: string): Promise<SensorInfo> {
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
                } else if (matchedString.includes('xsi:type="MonitorIoT:Sensor"')) {
                    sensorInfo.sensorNode = name;
                } else if (matchedString.includes('<hasProperty')) {
                    sensorInfo.property = name;
                }
            }

            return sensorInfo;
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
                await this.saveHierearchy(route);
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
        text: 'SELECT * FROM mdns_services WHERE location = $1',
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
                    services: sensorInfo
                },
                isSynced: true
            };
        }));
        return mdnsServices;
    } catch (error) {
        console.error('Error al obtener los servicios MDNS:', error);
        throw error;
    }
}

}