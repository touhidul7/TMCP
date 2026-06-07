const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const migrationFilePath = path.join(__dirname, "migrations", "002_add_ssh_columns.sql");

async function runSshMigration() {
  console.log("Reading SSH migration file...");
  const sql = fs.readFileSync(migrationFilePath, 'utf8');

  const region = "ap-southeast-1";
  const host = `aws-0-${region}.pooler.supabase.com`;
  const ports = [6543, 5432];

  for (const port of ports) {
    const connectionString = `postgresql://postgres.fuhuaanavqlgplraruon:Touhidulislam77@${host}:${port}/postgres`;
    console.log(`Trying port ${port} on ${host}...`);
    
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log(`Connected successfully on port ${port}! Running migration SQL...`);
      await client.query(sql);
      console.log("Migration executed successfully!");
      await client.end();
      return;
    } catch (err) {
      console.log(`Port ${port} failed: ${err.message}`);
      try {
        await client.end();
      } catch (e) {}
    }
  }
}

runSshMigration().catch(console.error);
