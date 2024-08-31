// import { Pool } from 'pg';
// import { Configuration } from '../config/parametros';
import  fs from 'fs';
import { promisify } from 'util';
import { parseStringPromise } from 'xml2js';
import { IotRequest } from './models.iot';

// const coneccion_bd = new Pool(Configuration.database);
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

    }

}