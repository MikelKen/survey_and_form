import { executeQuery } from "@tigo/postgres-connector";
import {
  normalizePagination,
  buildPaginationResponse,
} from "../utils/pagination.js";

/**
 * Capa de acceso a datos del recurso `forms`.
 * Estados posibles: 'DRAFT' (borrador) | 'PUBLISHED' (publicado)
 */

const TABLE_NAME = "forms";

const PUBLIC_COLUMNS = `
   id, creator_id, title, state, created_at, updated_at
`;

const ALLOWED_FORM_SORT = {
  title: "title",
  state: "state",
  created_at: "created_at",
  updated_at: "updated_at",
};

// Funcion para crear un nuevo formulario (siempre nace en DRAFT)
export const insertForm = async ({ creatorId, title }) => {
  const query = `
    INSERT INTO ${TABLE_NAME} (creator_id, title, state)
    VALUES ($1, $2, 'DRAFT')
    RETURNING ${PUBLIC_COLUMNS};
  `;
  const rows = await executeQuery(query, [creatorId, title]);
  return rows[0];
};

// Funcion para seleccionar un formulario por su ID
export const selectFormById = async (id) => {
  const query = `
    SELECT ${PUBLIC_COLUMNS} FROM ${TABLE_NAME} WHERE id = $1;
  `;
  const rows = await executeQuery(query, [id]);
  return rows[0];
};

// Funcion de uso exclusivo para validar estado antes de aceptar respuestas (RF-27.3)
// Trae solo lo minimo necesario para el chequeo, evitando columnas de mas.
export const selectFormStateById = async (id) => {
  const query = `
    SELECT id, state FROM ${TABLE_NAME} WHERE id = $1;
  `;
  const rows = await executeQuery(query, [id]);
  return rows[0];
};

// Funcion para listar formularios de un creador, con filtros y paginacion
export const selectFormsByCreator = async (
  creatorId,
  filters = {},
  rawPagination = {},
) => {
  const { page, perPage, offset, sort, order } = normalizePagination(
    rawPagination,
    ALLOWED_FORM_SORT,
    "created_at",
  );

  const conditions = ["creator_id = $1"];
  const values = [creatorId];
  let idx = 2;

  if (filters.title) {
    conditions.push(`title ILIKE $${idx++}`);
    values.push(`%${filters.title}%`);
  }

  if (filters.state) {
    conditions.push(`state = $${idx++}`);
    values.push(filters.state);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const countQuery = `
    SELECT COUNT(*) AS total FROM ${TABLE_NAME} ${whereClause};
  `;
  const countResult = await executeQuery(countQuery, values);
  const total = Number(countResult[0].total);

  const dataValues = [...values, perPage, offset];
  const dataQuery = `
    SELECT ${PUBLIC_COLUMNS}
    FROM ${TABLE_NAME}
    ${whereClause}
    ORDER BY ${sort} ${order}
    LIMIT $${idx++} OFFSET $${idx++};
  `;
  const rows = await executeQuery(dataQuery, dataValues);

  return buildPaginationResponse(rows, total, { page, perPage });
};

// Funcion para actualizar el titulo del formulario (solo tiene sentido en DRAFT,
export const updateFormTitle = async (id, title) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET title = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING ${PUBLIC_COLUMNS};
  `;
  const rows = await executeQuery(query, [id, title]);
  return rows[0];
};

// Actualizar un formulario (Solo si está en borrador)
export const updateForm = async (id, { title }) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET title = $1, updated_at = NOW()
    WHERE id = $2 AND state = 'DRAFT'
    RETURNING ${PUBLIC_COLUMNS};
  `;
  const rows = await executeQuery(query, [title, id]);
  return rows[0];
};

// Funcion para publicar un formulario
// El WHERE state = 'DRAFT' es una segunda capa de seguridad a nivel de query:
export const publishForm = async (id) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET state = 'PUBLISHED', updated_at = NOW()
    WHERE id = $1 AND state = 'DRAFT'
    RETURNING ${PUBLIC_COLUMNS};
  `;
  const rows = await executeQuery(query, [id]);
  return rows[0];
};

// Funcion para eliminar un formulario (cascada elimina preguntas por FK)
export const deleteForm = async (id) => {
  const query = `
    DELETE FROM ${TABLE_NAME} WHERE id = $1
    RETURNING id;
  `;
  const rows = await executeQuery(query, [id]);
  return rows[0];
};
