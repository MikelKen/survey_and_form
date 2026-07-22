const ALLOWED_ORDERS = new Set(["asc", "desc"]);

/**
 * Normaliza y sanitiza parámetros de paginación de forma genérica,
 * reutilizable para cualquier recurso (users, products, orders, etc)
 * */
export function normalizePagination(
  { page, perPage, sort, order } = {},
  allowedSortColumns = {},
  defaultSort = "created_at",
) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePerPage =
    Number.isInteger(perPage) && perPage > 0
      ? Math.min(perPage, 100) // techo para evitar DoS
      : 15;

  const safeSort = allowedSortColumns[sort] ?? defaultSort;
  const safeOrder = ALLOWED_ORDERS.has(String(order).toLowerCase())
    ? order.toLowerCase()
    : "asc";

  return {
    page: safePage,
    perPage: safePerPage,
    offset: (safePage - 1) * safePerPage,
    sort: safeSort,
    order: safeOrder,
  };
}

/**
 * Arma la respuesta final de paginación para el cliente.
 * */
export function buildPaginationResponse(items, total, { page, perPage }) {
  return {
    items: items ?? [],
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}
