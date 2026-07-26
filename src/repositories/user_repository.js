import { executeQuery } from "@tigo/postgres-connector";
import {
  normalizePagination,
  buildPaginationResponse,
} from "../utils/pagination.js";

const TABLE_NAME = "users";
const PUBLIC_COLUMNS = `id, name, email, role, created_at`;

const ALLOWED_USER_SORT = {
  name: "name",
  email: "email",
  role: "role",
  created_at: "created_at",
};

// Funcion para insertar un nuevo usuario en la base de datos
export const insertUser = async ({ name, email, passwordHash, role }) => {
  const query = `
        INSERT INTO ${TABLE_NAME} (name, email, password_hash, role) 
        VALUES (
            $1, 
            $2, 
            $3, 
            $4
        ) 
        RETURNING ${PUBLIC_COLUMNS};
    `;

  const rows = await executeQuery(query, [name, email, passwordHash, role]);
  return rows[0];
};

// Funcion para seleccionar un usuario por su ID
export const selectUserById = async (id) => {
  const query = `
        SELECT ${PUBLIC_COLUMNS} FROM ${TABLE_NAME} WHERE id = $1;
    `;
  const values = [id];
  const result = await executeQuery(query, values);
  return result[0];
};

// Funcion para uso exclusivo para el flujo de login
export const selectUserByEmailWithPassword = async (email) => {
  const query = `
    SELECT id, name, email, password_hash, role, created_at
    FROM ${TABLE_NAME}
    WHERE email = $1;
  `;
  const rows = await executeQuery(query, [email]);
  return rows[0];
};

// Funcion para seleccionar todos los usuarios
export const selectAllUsers = async (filters = {}, rawPagination = {}) => {
  const { page, perPage, offset, sort, order } = normalizePagination(
    rawPagination,
    ALLOWED_USER_SORT,
    "created_at",
  );

  const conditions = [];
  const values = [];
  let idx = 1;

  if (filters.name) {
    conditions.push(`name ILIKE $${idx++}`);
    values.push(`%${filters.name}%`);
  }

  if (filters.role) {
    conditions.push(`role = $${idx++}`);
    values.push(filters.role);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  // Query de Total
  const countQuery = `
    SELECT COUNT(*) AS total FROM ${TABLE_NAME} ${whereClause};
  `;
  const countResult = await executeQuery(countQuery, values);
  const total = Number(countResult[0].total);

  // Query de Datos Paginados
  const dataValues = [...values, perPage, offset];
  const dataQuery = `
    SELECT ${PUBLIC_COLUMNS}
    FROM ${TABLE_NAME}
    ${whereClause}
    ORDER BY ${sort} ${order}
    LIMIT $${idx++} OFFSET $${idx + 1};
  `;
  const rows = await executeQuery(dataQuery, dataValues);

  return buildPaginationResponse(rows, total, { page, perPage });
};
