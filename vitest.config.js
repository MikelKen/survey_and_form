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
      reporter: ["text", "lcov"],
      exclude: [
        "index.js",
        "src/**/*.routes.js",
        "vitest.config.js",
        "eslint.config.js",
        "src/utils/config.js",
        "src/utils/constants.js",
        "**/tigo/**",
        "**/node_modules/**",
      ],
    },
  },
});
