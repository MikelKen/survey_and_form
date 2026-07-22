import { executeQuery } from "@tigo/postgres-connector";
import {
  normalizePagination,
  buildPaginationResponse,
} from "../utils/pagination.js";

/**
 * Capa de acceso a datos del recurso Answers (envios/submissions)
 */

const TABLE_NAME = "answers";

const PUBLIC_COLUMNS = `id, form_id, sent_at`;

const ALLOWED_SUBMISSION_SORT = {
  sent_at: "sent_at",
};

// Funcion para crear la cabecera de un envio de respuestas
export const insertSubmission = async (formId) => {
  const query = `
    INSERT INTO ${TABLE_NAME} (form_id)
    VALUES ($1)
    RETURNING ${PUBLIC_COLUMNS};
  `;
  const rows = await executeQuery(query, [formId]);
  return rows[0];
};

// Funcion para traer un envio puntual
export const selectSubmissionById = async (id) => {
  const query = `
    SELECT ${PUBLIC_COLUMNS} FROM ${TABLE_NAME} WHERE id = $1;
  `;
  const rows = await executeQuery(query, [id]);
  return rows[0];
};

// Funcion para listar los envios de un formulario (paginado)
export const selectSubmissionsByForm = async (formId, rawPagination = {}) => {
  const { page, perPage, offset, sort, order } = normalizePagination(
    rawPagination,
    ALLOWED_SUBMISSION_SORT,
    "sent_at",
  );

  const countQuery = `
    SELECT COUNT(*) AS total FROM ${TABLE_NAME} WHERE form_id = $1;
  `;
  const countResult = await executeQuery(countQuery, [formId]);
  const total = Number(countResult[0].total);

  const dataQuery = `
    SELECT ${PUBLIC_COLUMNS}
    FROM ${TABLE_NAME}
    WHERE form_id = $1
    ORDER BY ${sort} ${order}
    LIMIT $2 OFFSET $3;
  `;
  const rows = await executeQuery(dataQuery, [formId, perPage, offset]);

  return buildPaginationResponse(rows, total, { page, perPage });
};

// Funcion para contar cuantos envios tiene un formulario
export const countSubmissionsByForm = async (formId) => {
  const query = `
    SELECT COUNT(*) AS total FROM ${TABLE_NAME} WHERE form_id = $1;
  `;
  const rows = await executeQuery(query, [formId]);
  return Number(rows[0].total);
};
