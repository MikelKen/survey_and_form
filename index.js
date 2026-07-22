import "dotenv/config";
import app from "./src/app.js";
import { initializeDB } from "@tigo/postgres-connector";
import { runMigrations } from "./database/migrate.js";

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await initializeDB();
    await runMigrations();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("[Startup] Failed to start server:", err.message);
    process.exit(1);
  }
}

bootstrap();
