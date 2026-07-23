import { dbConfig } from "./config/dbConfig.js";
import { PostgresConnector } from "./lib/postgresConnector.js";

let dbInstances = new Map();

export const initializeDB = async (name = "default", config = dbConfig) => {
  if (dbInstances.has(name)) {
    return dbInstances.get(name);
  };

  // Initializes the connection pool
  const instance = new PostgresConnector(config);
  await instance.initPool();
  dbInstances.set(name, instance);
  return instance
};

export const getDB = (name = "default") => {
  const instance = dbInstances.get(name);

  if (!instance) {
    throw new Error(
      `[Postgres] Database '${name}' not initialized. Call initializeDB('${name}') first.`
    );
  }

  return instance;
}

export const executeQuery = async (query, params = [], name = "default") => {
  return await getDB(name).executeQuery(query, params);
};

export const executeStoreProcedure = async (
  spName,
  procedureParams = [],
  cursorName = null,
  name = "default"
) => {
  return await getDB(name).executeStoreProcedure(spName, procedureParams, cursorName);
};

export const closeConnection = async (name = "default") => {
  const instance = getDB(name);
  await instance.closePool();
  dbInstances.delete(name);
};

export const closeAllConnections = async () => {
  for (const [name, instance] of dbInstances.entries()) {
    await instance.closePool();
    dbInstances.delete(name);
  }
};
