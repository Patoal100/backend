import { Pool } from 'pg';
import { Configuration } from '../config/parametros';
import  fs from 'fs';
import { promisify } from 'util';
import { parseStringPromise } from 'xml2js';
import { IotRequest, MdnsService } from './models.iot';

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
        const mdnsServices: MdnsService[] = result.rows.map((row: any) => ({
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
    } catch (error) {
        console.error('Error al obtener los servicios MDNS:', error);
        throw error;
    }
}

}