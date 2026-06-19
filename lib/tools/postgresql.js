const { decryptText } = require("../crypto/decrypt");

// PostgreSQL connection details live in the account's connection_metadata
// (host/port/database/username/ssl); the password is stored encrypted.
function buildConfig(connectionMetadata = {}, credentialRecord) {
  const host = connectionMetadata.host;
  const database = connectionMetadata.database;
  const user = connectionMetadata.username || connectionMetadata.user;
  if (!host || !database || !user) return null;

  const password = credentialRecord?.encrypted_password
    ? decryptText(credentialRecord.encrypted_password)
    : (credentialRecord?.encrypted_api_key ? decryptText(credentialRecord.encrypted_api_key) : undefined);

  const sslMode = String(connectionMetadata.ssl || "Disable").toLowerCase();
  const ssl = sslMode === "disable" || sslMode === "false" || sslMode === "" ? false : { rejectUnauthorized: false };

  return {
    host,
    port: Number(connectionMetadata.port) || 5432,
    database,
    user,
    password,
    ssl,
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000
  };
}

function isReadOnly(sql) {
  return /^\s*(select|with|show|explain)\b/i.test(sql);
}

async function withClient(config, fn) {
  // Lazy-require so environments without pg installed still load other tools.
  const { Client } = require("pg");
  const client = new Client(config);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function runPostgresqlTool({ featureKey, input = {}, credentialRecord, connectionMetadata = {} }) {
  const config = buildConfig(connectionMetadata, credentialRecord);
  const hasConnection = Boolean(config && config.password);

  if (featureKey === "postgresql.query") {
    const sql = input.sql || input.query;
    if (!sql) throw new Error("Missing sql/query for postgresql.query");
    if (!isReadOnly(sql)) {
      throw new Error("postgresql.query only allows read statements (SELECT/WITH/SHOW/EXPLAIN). Use postgresql.execute for mutations.");
    }
    if (!hasConnection) {
      return { success: true, rows: [{ example: "sandbox-row" }], row_count: 1, mode: "sandbox-simulation" };
    }
    const result = await withClient(config, (client) => client.query(sql, input.params || input.values || []));
    return { success: true, rows: result.rows, row_count: result.rowCount, fields: (result.fields || []).map((f) => f.name), mode: "authenticated" };
  }

  if (featureKey === "postgresql.execute") {
    const sql = input.sql || input.query;
    if (!sql) throw new Error("Missing sql/query for postgresql.execute");
    if (isReadOnly(sql)) {
      throw new Error("Use postgresql.query for read statements; postgresql.execute is for INSERT/UPDATE/DELETE.");
    }
    if (!hasConnection) {
      return { success: true, row_count: 0, mode: "sandbox-simulation" };
    }
    const result = await withClient(config, (client) => client.query(sql, input.params || input.values || []));
    return { success: true, row_count: result.rowCount, rows: result.rows || [], command: result.command, mode: "authenticated" };
  }

  if (featureKey === "postgresql.list_tables") {
    if (!hasConnection) {
      return { success: true, tables: [{ table_schema: "public", table_name: "sandbox_table" }], mode: "sandbox-simulation" };
    }
    const schema = input.schema || "public";
    const result = await withClient(config, (client) => client.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
      [schema]
    ));
    return { success: true, tables: result.rows, count: result.rowCount, mode: "authenticated" };
  }

  throw new Error(`Unsupported PostgreSQL feature key: ${featureKey}`);
}

module.exports = { runPostgresqlTool };
