import pkg from "pg";
import { DbConnectorException } from "../exceptions/connectorException.js";
import { isSafeCursorName } from "../utils/cursorValidator.js";
import { logger } from "@tigo/logger";

const { Pool } = pkg;

export class PostgresConnector {
  constructor(config) {
    this.pool = null;
    this.config = config;
  }

  // Initializes the connection pool
  async initPool() {
    try {
      // Create a new pool with the following configuration
      if(this.config.connectionString){
        const { connectionString, max } = this.config;
        this.pool = new Pool({ connectionString, max });
        
      }else{
        this.pool = new Pool(this.config);
      }
      const client = await this.pool.connect();
      client.release();
      console.log("[Postgres] connection pool initialized successfully");
    } catch (error) {
      console.error(
        "[Postgres] Error initializing connection pool:",
        error.message
      );
      throw new Error("[Postgres] Error initializing connection pool");
    }
  }

  async getConnection() {
    // Gets a connection from the pool
    if (this.pool) return await this.pool.connect();
    throw new Error(
      "[Postgres] Connection pool not initialized. Call initPool() first."
    );
  }

  async executeQuery(query, params = []) {
    logger.startTimer(`[Postgres] Executing query: ${query}`);
    logger.info({ "[Postgres] Query parameters:": params });
    let client;
    try {
      // Obtains a connection
      client = await this.getConnection();
      // Execute the query
      const result = await client.query(query, params);
      logger.info({ "[query]": query, "[RESPONSE]": result.rows });
      return result.rows;
    } catch (error) {
      logger.error("[Postgres] Error executing query:", error.message);
      throw new DbConnectorException(
        `[Postgres] Error executing query: ${error.message}`
      );
    } finally {
      logger.endTimer(`[Postgres] Executing query: ${query}`);
      if (client) {
        try {
          client.release();
        } catch (error) {
          logger.error("[Postgres] Error releasing connection:", error.message);
        }
      }
    }
  }

  async executeStoreProcedure(spName, procedureParams, cursorName) {
    logger.startTimer(`[Postgres] Executing stored procedure: ${spName}`);
    logger.info({ "[SP]": spName, "[params]": procedureParams });
    let client;

    try {
      client = await this.getConnection();
      // Start a transaction
      await client.query("BEGIN");
      const placeholders = procedureParams.map((_, i) => `$${i + 1}`);

      if (cursorName) {
        placeholders.push(`$${procedureParams.length + 1}`);
      }

      const callQuery = `CALL ${spName}(${placeholders.join(", ")})`;

      const fullParams = cursorName
        ? [...procedureParams, cursorName]
        : procedureParams;

      // Call the stored procedure
      await client.query(callQuery, fullParams);

      let result = { rows: [] };

      if (cursorName) {
        if (isSafeCursorName(cursorName)) {
          const fetchQuery = `FETCH ALL FROM ${cursorName}`;
          const closeQuery = `CLOSE ${cursorName}`;
          const fetchResult = await client.query(fetchQuery);
          await client.query(closeQuery);
          result.rows = fetchResult.rows;
        } else {
          throw new DbConnectorException("[Postgres] Invalid cursor name");
        }
      }

      await client.query("COMMIT");
      logger.info({ "[SP]": spName, "[RESPONSE]": result.rows });
      return result.rows;
    } catch (err) {
      if (client) await client.query("ROLLBACK");
      logger.error("[Postgres] Error executing stored procedure:", err.message);
      throw new DbConnectorException(
        `Postgres Error executing stored procedure: ${err.message}`
      );
    } finally {
      logger.endTimer(`[Postgres] Executing stored procedure: ${spName}`);
      if (client) {
        try {
          client.release();
        } catch (error) {
          logger.error("[Postgres] Error releasing connection:", error.message);
        }
      }
    }
  }

  async closePool() {
    if (this.pool) {
      try {
        // Close the pool
        await this.pool.end();
        logger.info("[Postgres] Connection pool closed successfully");
      } catch (error) {
        logger.error(
          "[Postgres] Error closing connection pool:",
          error.message
        );
        throw error;
      }
    }
  }
}
