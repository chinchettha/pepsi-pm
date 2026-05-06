import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}
