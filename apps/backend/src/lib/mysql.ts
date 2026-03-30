import mysql from 'mysql2/promise';

import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool__: mysql.Pool | undefined;
}

export const pool =
  globalThis.__mysqlPool__ ??
  (globalThis.__mysqlPool__ = mysql.createPool({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10
  }));

export async function getConnection() {
  return pool.getConnection();
}
