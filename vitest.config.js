import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // Habilita describe, it, expect globales
    timeout: 10000,
    // Le dice a Vitest que SOLO busque pruebas en tu carpeta principal test/
    include: ["test/**/*.test.js"],
    // Opcionalmente ignora cualquier otra carpeta de tests
    exclude: ["**/node_modules/**", "**/tigo/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "index.js",
        "src/app.js",
        "src/**/*.routes.js",
        "vitest.config.js",
        "eslint.config.js",
        "src/utils/config.js",
        "src/utils/constants.js",
        "src/utils/pagination.js",
        "src/utils/response.js",
        "src/middleware/rate_limit_middleware.js",
        "**/tigo/**",
        "**/node_modules/**",
      ],
    },
  },
});
