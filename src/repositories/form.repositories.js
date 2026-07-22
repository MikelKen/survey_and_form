import { executeQuery } from "@tigo/postgres-connector";

/**
 * Capa de acceso a datos del recurso `forms`.
 */

const TABLE = "forms";

const COLUMNS = `
   creator_id, title, state
`;

export const insertForm = async ({ creator_id, title, state }) => {
  const query = `
    INSERT INTO ${TABLE}  (${COLUMNS}) 
    VALUES (
      $1::uuid,
      $2::varchar,
      COALESCE($3::varchar, 'DRAFT')
    )
    RETURNING *;
  `;
  const params = [creator_id, title, state ?? null];
  return await executeQuery(query, params);
};

export const selectFormById = async (id) => {
  const query = `SELECT ${COLUMNS} FROM ${TABLE} WHERE id = $1;`;
  const result = await executeQuery(query, [id]);
  return result[0];
};

export const selectFormsByCreator = async (creator_id) => {
  const query = `
    SELECT ${COLUMNS} FROM ${TABLE}
    WHERE creator_id = $1
    ORDER BY created_at DESC;
  `;
  const result = await executeQuery(query, [creator_id]);
  return result;
};

export const updateForm = async (id, { title, state }) => {
  const query = `
    UPDATE ${TABLE}
    SET
      title = COALESCE($2::varchar, title),
      state = COALESCE($3::varchar, state),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const params = [id, title ?? null, state ?? null];
  const result = await executeQuery(query, params);
  return result[0];
};

export const deleteForm = async (id) => {
  const query = `DELETE FROM ${TABLE} WHERE id = $1 RETURNING id;`;
  const result = await executeQuery(query, [id]);
  return result[0];
};
