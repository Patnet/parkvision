import { buildApp } from "./app.js";
import { pool } from "./db.js";

const PORT = Number(process.env.PORT ?? 3001);

async function main() {
  const app = await buildApp(pool);
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`ParkVision API (SIMULATION) à l'écoute sur :${PORT} — docs sur /docs`);
}

main().catch((error) => {
  console.error("Échec du démarrage de l'API :", error);
  process.exitCode = 1;
});
