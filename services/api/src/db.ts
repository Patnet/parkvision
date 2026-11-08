import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://parkvision:parkvision@localhost:5432/parkvision";

export const pool = new Pool({ connectionString: DATABASE_URL });
