export const dbConfig = {
  user: process.env.P_DB_USER,
  database: process.env.P_DB_NAME,
  port: process.env.P_DB_PORT,
  host: process.env.P_DB_HOST,
  password: process.env.P_DB_PASSWORD,
  max: parseInt(process.env.P_DB_MAX_CONNECTIONS, 10) || 2,
  connectionString: process.env.P_DB_CONNECTION_STRING || null
};