// import { Pool } from 'pg';
// import { Configuration } from '../config/parametros';
import  fs from 'fs';
import { promisify } from 'util';
import { parseStringPromise } from 'xml2js';

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

    async getIot(): Promise<any> {
    }
}