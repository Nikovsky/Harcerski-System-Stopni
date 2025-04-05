/**
 * @file src/config/typeorm.datasources.ts
 * @description TypeORM Datasource configuration file for connecting to the database.
 */

import { DataSource } from 'typeorm';
import * as path from 'path';

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'hss',
    entities: [path.join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
    migrations: ['src/migrations/*.ts'],
    synchronize: true,
});
// EOF