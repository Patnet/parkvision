import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { buildApp } from "./app.js";

// Pool pointant vers une base inexistante : on vérifie ici le comportement
// de l'API (routing, dégradation propre), pas l'intégration PostGIS réelle,
// qui est couverte séparément une fois `docker compose up` lancé.
const pool = new Pool({ connectionString: "postgres://invalid:invalid@127.0.0.1:1/invalid" });

describe("ParkVision API", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("exposes a root route announcing simulation mode", async () => {
    const app = await buildApp(pool);
    const response = await app.inject({ method: "GET", url: "/" });
    expect(response.statusCode).toBe(200);
    expect(response.json().mode).toBe("SIMULATION — DONNÉES FICTIVES");
    await app.close();
  });

  it("reports a degraded health status when the database is unreachable", async () => {
    const app = await buildApp(pool);
    const response = await app.inject({ method: "GET", url: "/v1/health" });
    expect(response.statusCode).toBe(503);
    expect(response.json().status).toBe("degraded");
    await app.close();
  });

  it("rejects an invalid destination search query", async () => {
    const app = await buildApp(pool);
    const response = await app.inject({ method: "GET", url: "/v1/destinations/search?q=a" });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("serves the OpenAPI documentation route", async () => {
    const app = await buildApp(pool);
    const response = await app.inject({ method: "GET", url: "/docs" });
    expect(response.statusCode).toBe(200);
    await app.close();
  });
});
