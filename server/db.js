import './config.js';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || '20612',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'gotham_20612',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
});

pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export default pool;
