export default {
  BR001: {
    statusHttp: 400,
    message: "Missing required parameter",
  },
  BR002: {
    statusHttp: 400,
    message: "Invalid data type",
  },
  BR003: {
    statusHttp: 400,
    message: "Unsupported format",
  },
  BR004: {
    statusHttp: 400,
    message: "Unsupported HTTP method",
  },
  AU001: {
    statusHttp: 401,
    message: "Invalid token",
  },
  AU002: {
    statusHttp: 401,
    message: "Token expired",
  },
  AU003: {
    statusHttp: 401,
    message: "Missing token",
  },
  PM001: {
    statusHttp: 402,
    message: "Payment required",
  },
  PM002: {
    statusHttp: 402,
    message: "Insufficient balance",
  },
  PM003: {
    statusHttp: 402,
    message: "Payment authorization failed",
  },
  PM004: {
    statusHttp: 402,
    message: "Subscription expired",
  },
  PM005: {
    statusHttp: 402,
    message: "Payment token invalid",
  },
  FB001: {
    statusHttp: 403,
    message: "Access denied",
  },
  NF001: {
    statusHttp: 404,
    message: "Not found",
  },
  NF002: {
    statusHttp: 404,
    message: "MSISDN not found",
  },
  MA001: {
    statusHttp: 405,
    message: "Method not allowed",
  },
  MA002: {
    statusHttp: 405,
    message: "Method not implemented",
  },
  NA001: {
    statusHttp: 406,
    message: "Not Acceptable",
  },
  NA002: {
    statusHttp: 406,
    message: "Unsupported media type",
  },
  CF001: {
    statusHttp: 409,
    message: "Resource conflict",
  },
  UE001: {
    statusHttp: 422,
    message: "Invalid document format",
  },
  RL001: {
    statusHttp: 429,
    message: "Too many requests",
  },
  SE001: {
    statusHttp: 500,
    message: "Generic internal server error",
  },
  BG001: {
    statusHttp: 502,
    message: "Gateway or proxy error",
  },
  SU001: {
    statusHttp: 503,
    message: "Service temporarily unavailable",
  },
  GT001: {
    statusHttp: 504,
    message: "Timeout waiting for upstream service",
  },
}