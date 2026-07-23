import bcrypt from "bcrypt";
import { logger } from "@tigo/logger";
import { errorCodes, setError } from "../utils/errorCodes.js";
import {
  loginUserSchema,
  listUsersFilterSchema,
  userIdParamSchema,
} from "../schemas/user_schema.js";
import {
  insertUser,
  selectUserByEmailWithPassword,
  selectUserById,
  selectAllUsers,
} from "../repositories/user_repository.js";
import { generateToken } from "../helpers/jws_token.js";

const SALT_ROUNDS = 10;

/**
 * Parsea un payload contra un schema de Zod y traduce errores
 * de validacion
 * */
const parseOrThrow = (schema, payload) => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(" | ");
    throw setError(`Payload invalido: ${details}`, errorCodes.VALIDATION);
  }

  return result.data;
};

/**
 * Funcion para crear usuario
 */
export const createUserService = async (data) => {
  logger.info({ createUserService: { "[EMAIL]": data.email } });

  const normalizedEmail = data.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  try {
    const newUser = await insertUser({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: data.role,
    });

    // Generar el token para el nuevo usuario
    const token = generateToken(newUser);

    return {
      ...newUser,
      token, // <--- Se agrega el token al objeto retornado
    };
  } catch (err) {
    if (err.code === "23505") {
      throw setError("El email ya esta registrado", errorCodes.CONFLICT);
    }
    logger.error({ createUserService: { error: err.message } });
    throw setError("No se pudo crear el usuario", errorCodes.UNKNOWN);
  }
};
/**
 * Busca un usuario por ID
 */
export const getUserService = async (params) => {
  const { id } = parseOrThrow(userIdParamSchema, params);

  logger.info({ getUserService: { "[ID]": id } });

  const user = await selectUserById(id);
  if (!user) {
    throw setError(`Usuario ${id} no encontrado`, errorCodes.NOT_FOUND);
  }
  return user;
};

/**
 * Verifica credenciales del login
 */
export const loginUserService = async (body) => {
  const data = parseOrThrow(loginUserSchema, body);

  logger.info({ loginUserService: { "[EMAIL]": data.email } });

  const normalizedEmail = data.email.trim().toLowerCase();
  const user = await selectUserByEmailWithPassword(normalizedEmail);

  if (!user) {
    throw setError("Credenciales invalidas", errorCodes.VALIDATION);
  }

  const isValid = await bcrypt.compare(data.password, user.password_hash);
  if (!isValid) {
    throw setError("Credenciales invalidas", errorCodes.VALIDATION);
  }

  const { password_hash, ...safeUser } = user;

  // Generar token JWT
  const token = generateToken(safeUser);

  // Retornar el usuario limpio junto con su token
  return {
    ...safeUser,
    token, // <--- Retorna el JWT
  };
};

/**
 * Lista usuarios paginados, validando filtros y paginacion
 */
export const listUsersService = async (rawQuery) => {
  const data = parseOrThrow(listUsersFilterSchema, rawQuery);

  logger.info({
    listUsersService: { "[FILTERS]": { name: data.name, roles: data.roles } },
  });

  const filters = { name: data.name, roles: data.roles };
  const rawPagination = {
    page: data.page,
    perPage: data.perPage,
    sort: data.sort,
    order: data.order,
  };

  return selectAllUsers(filters, rawPagination);
};
