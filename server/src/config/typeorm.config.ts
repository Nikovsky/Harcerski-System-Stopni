/**
 * @file src/config/typeorm.config.ts
 * @description TypeORM configuration file for connecting to the database.
 */

import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import 'dotenv/config';
import * as path from "path";

/**
 * @description Asynchronous function returning TypeORM configuration options for connecting to a MySQL database.
 * @returns Promise resolving to TypeOrmModuleOptions with database connection settings.
 */
export const typeOrmConfig = async (): Promise<TypeOrmModuleOptions> => ({
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'hss',
    synchronize: true,
    autoLoadEntities: true,
    multipleStatements: true,
})

//EOF