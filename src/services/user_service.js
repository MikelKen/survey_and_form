import bcrypt from "bcrypt";
import { logger } from "@tigo/logger";
import { errorCodes, setError } from "../utils/errorCodes.js";
import {
  insertUser,
  selectUserByEmailWithPassword,
  selectUserById,
  selectAllUsers,
} from "../repositories/user_repository.js";
import { generateToken } from "../config/jws_token.js";

const SALT_ROUNDS = 10;

/**
 * Servicio para crear usuario
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
      token,
    };
  } catch (err) {
    if (
      err.code === "23505" ||
      err.message?.includes("23505") ||
      err.message?.includes("duplicate key")
    ) {
      throw setError("El email ya esta registrado", errorCodes.CONFLICT);
    }
    logger.error({ createUserService: { error: err.message } });
    throw setError("No se pudo crear el usuario", errorCodes.UNKNOWN);
  }
};

/**
 * Busca un usuario por ID
 */
export const getUserService = async (payload) => {
  const { id } = payload;

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
export const loginUserService = async (data) => {
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
  const token = generateToken(safeUser);

  return {
    ...safeUser,
    token,
  };
};

/**
 * Lista usuarios paginados
 */
export const listUsersService = async (data) => {
  logger.info({
    listUsersService: { "[FILTERS]": { name: data.name, role: data.role } },
  });

  const filters = { name: data.name, role: data.role };
  const rawPagination = {
    page: data.page,
    perPage: data.perPage,
    sort: data.sort,
    order: data.order,
  };

  return selectAllUsers(filters, rawPagination);
};
