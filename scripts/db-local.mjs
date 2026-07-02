// Локальный PostgreSQL без Docker (embedded-postgres).
// Используется, когда Docker недоступен: `npm run db:local`.
// Данные хранятся в .pgdata/ (в .gitignore).
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(import.meta.dirname, "..", ".pgdata");

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "studiocrm",
  password: "studiocrm",
  port: 5432,
  persistent: true,
});

const isInitialized = existsSync(path.join(dataDir, "PG_VERSION"));

if (!isInitialized) {
  console.log("Инициализация кластера PostgreSQL в .pgdata/ ...");
  await pg.initialise();
}

await pg.start();

if (!isInitialized) {
  await pg.createDatabase("studiocrm");
}

console.log("PostgreSQL запущен: postgresql://studiocrm:studiocrm@localhost:5432/studiocrm");
console.log("Остановка: Ctrl+C");

const stop = async () => {
  console.log("\nОстанавливаю PostgreSQL ...");
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
