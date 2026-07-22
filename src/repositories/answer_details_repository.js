import { executeQuery } from "@tigo/postgres-connector";

/**
 * Capa de acceso a datos del recurso Answer Details (detalle de respuestas)
 */

const TABLE_NAME = "answer_details";

const PUBLIC_COLUMNS = `id, submission_id, question_id, value`;

// Funcion para insertar TODAS las respuestas de un envio de una sola vez.
export const insertAnswerDetailsBulk = async (submissionId, details) => {
  if (!details?.length) return [];

  const values = [];
  const placeholders = details.map((detail, i) => {
    const base = i * 3;
    values.push(submissionId, detail.questionId, String(detail.value));
    return `($${base + 1}, $${base + 2}, $${base + 3})`;
  });

  const query = `
    INSERT INTO ${TABLE_NAME} (submission_id, question_id, value)
    VALUES ${placeholders.join(", ")}
    RETURNING ${PUBLIC_COLUMNS};
  `;
  return await executeQuery(query, values);
};

// Funcion para traer el detalle completo de un envio puntual
export const selectDetailsBySubmission = async (submissionId) => {
  const query = `
    SELECT ${PUBLIC_COLUMNS} FROM ${TABLE_NAME} WHERE submission_id = $1;
  `;
  const rows = await executeQuery(query, [submissionId]);
  return rows;
};

// Funcion para traer el conteo de respuestas por pregunta en un formulario (Consultar resultados).
export const selectRawAggregationByForm = async (formId) => {
  const query = `
    SELECT
      q.id            AS question_id,
      q.question_text AS question_text,
      q.type          AS type,
      q.order_index   AS order_index,
      ad.value        AS value,
      COUNT(ad.id)    AS value_count
    FROM questions q
    LEFT JOIN answer_details ad ON ad.question_id = q.id
    WHERE q.form_id = $1
    GROUP BY q.id, q.question_text, q.type, q.order_index, ad.value
    ORDER BY q.order_index ASC, value_count DESC;
  `;
  const rows = await executeQuery(query, [formId]);
  return rows;
};

// Funcion helper para transformar las filas "crudas" de arriba en un reporte legible por pregunta.
export const buildResultsReport = (rawRows) => {
  const questionsMap = new Map();

  for (const row of rawRows) {
    if (!questionsMap.has(row.question_id)) {
      questionsMap.set(row.question_id, {
        questionId: row.question_id,
        questionText: row.question_text,
        type: row.type,
        totalResponses: 0,
        distribution: {},
      });
    }

    const entry = questionsMap.get(row.question_id);

    // Si no hay respuestas, ad.value viene NULL por el LEFT JOIN
    if (row.value === null) continue;

    const count = Number(row.value_count);
    entry.totalResponses += count;
    entry.distribution[row.value] = count;
  }

  const results = Array.from(questionsMap.values());

  // Para preguntas NUMBER, se calcula el promedio/min/max a partir del
  // mismo distribution (valor -> cantidad), sin ir de nuevo a la base.
  for (const entry of results) {
    if (entry.type !== "NUMBER") continue;

    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const [value, count] of Object.entries(entry.distribution)) {
      const numericValue = Number(value);
      sum += numericValue * count;
      min = Math.min(min, numericValue);
      max = Math.max(max, numericValue);
    }

    entry.average =
      entry.totalResponses > 0 ? sum / entry.totalResponses : null;
    entry.min = entry.totalResponses > 0 ? min : null;
    entry.max = entry.totalResponses > 0 ? max : null;
  }

  return results;
};
