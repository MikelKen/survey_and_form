import { executeQuery } from "@tigo/postgres-connector";

/**
 * Capa de acceso a datos del recurso Questions (Preguntas)
 */

const TABLE_NAME = "questions";

const PUBLIC_COLUMNS = `id, form_id, question_text, type, required, order_index`;

// Funcion para agregar una pregunta a un formulario
export const insertQuestion = async ({
  formId,
  questionText,
  type,
  required = false,
  orderIndex = 1,
}) => {
  const query = `
    INSERT INTO ${TABLE_NAME} (form_id, question_text, type, required, order_index)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING ${PUBLIC_COLUMNS};
  `;
  const rows = await executeQuery(query, [
    formId,
    questionText,
    type,
    required,
    orderIndex,
  ]);
  return rows[0];
};

// Funcion para traer una pregunta puntual (util para editar o borrar)
export const selectQuestionById = async (id) => {
  const query = `
    SELECT ${PUBLIC_COLUMNS} FROM ${TABLE_NAME} WHERE id = $1;
  `;
  const rows = await executeQuery(query, [id]);
  return rows[0];
};

// Funcion para obtener todas las preguntas asociadas a un formulario (ordenadas)
export const selectQuestionsByFormId = async (formId) => {
  const query = `
    SELECT ${PUBLIC_COLUMNS}
    FROM ${TABLE_NAME}
    WHERE form_id = $1
    ORDER BY order_index ASC;
  `;
  return await executeQuery(query, [formId]);
};

// Funcion para contar preguntas de un formulario.
export const countQuestionsByFormId = async (formId) => {
  const query = `
    SELECT COUNT(*) AS total FROM ${TABLE_NAME} WHERE form_id = $1;
  `;
  const rows = await executeQuery(query, [formId]);
  return Number(rows[0].total);
};

// Funcion para editar una pregunta (solo debe permitirse si el form sigue en DRAFT,
export const updateQuestion = async (
  id,
  { questionText, type, required, orderIndex },
) => {
  const query = `
    UPDATE ${TABLE_NAME}
    SET question_text = $2,
        type = $3,
        required = $4,
        order_index = $5
    WHERE id = $1
    RETURNING ${PUBLIC_COLUMNS};
  `;
  const rows = await executeQuery(query, [
    id,
    questionText,
    type,
    required,
    orderIndex,
  ]);
  return rows[0];
};

// Funcion para eliminar una pregunta
export const deleteQuestion = async (id) => {
  const query = `
    DELETE FROM ${TABLE_NAME} WHERE id = $1
    RETURNING id;
  `;
  const rows = await executeQuery(query, [id]);
  return rows[0];
};
