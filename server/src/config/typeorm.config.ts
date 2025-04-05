/**
 * @file src/config/typeorm.config.ts
 * @description TypeORM configuration file for connecting to the database.
 */

import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import 'dotenv/config';
import * as path from "path";

export const typeOrmConfig = async (): Promise<TypeOrmModuleOptions> => ({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'hss',
    // entities: [path.join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
    synchronize: true,
    autoLoadEntities: true,
    multipleStatements: true,
})

//EOF