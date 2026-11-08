import { Pool } from "pg";
import { runSeed } from "./seedRunner.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://parkvision:parkvision@localhost:5432/parkvision";

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    const summary = await runSeed(pool);
    console.log(
      `Seed SIM-45100 terminé : ${summary.streets} rues, ${summary.spaces} emplacements fictifs ` +
        `(${summary.freeReported} signalés libres, ${summary.occupiedReported} signalés occupés, le reste inconnu/expiré).`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Échec du seed SIM-45100 :", error);
  process.exitCode = 1;
});
