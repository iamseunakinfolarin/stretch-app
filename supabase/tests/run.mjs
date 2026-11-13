#!/usr/bin/env node
// Runs the SQL tests in supabase/tests against the LOCAL Supabase database.
//
// Each test file runs as one transaction: begin, helpers, fixtures, the test, rollback.
// Nothing is left behind. A failed check raises an error, which fails the file.
//
//   npm run test:db               run every test
//   npm run test:db -- e_join     run the tests whose file name contains "e_join"
//   npm run test:db -- --print    print the bundled scripts instead of running them
//                                 (for running against the hosted project through the Supabase MCP)

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// The local stack's well-known default login. This is not a secret and only works on this machine.
// The hosted project's database password is never used or stored anywhere in this project.
const LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const dbUrl = process.env.STRETCH_LOCAL_DB_URL || LOCAL_DB_URL;
const host = new URL(dbUrl).hostname;
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error(`Refusing to run: ${host} is not a local database. Use the Supabase MCP for the hosted project.`);
  process.exit(2);
}

const args = process.argv.slice(2);
const print = args.includes("--print");
const filters = args.filter((a) => !a.startsWith("--"));

const read = (name) => readFileSync(join(here, name), "utf8");
const tests = readdirSync(here)
  .filter((f) => f.endsWith(".sql") && !f.startsWith("_"))
  .filter((f) => filters.length === 0 || filters.some((x) => f.includes(x)))
  .sort();

const bundle = (file) =>
  ["begin;", read("_helpers.sql"), read("_fixtures.sql"), `-- ===== ${file} =====`, read(file), "rollback;", ""].join("\n");

if (print) {
  for (const file of tests) process.stdout.write(bundle(file));
  process.exit(0);
}

let failed = 0;
let checks = 0;
for (const file of tests) {
  const result = spawnSync("psql", [dbUrl, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-f", "-"], {
    input: bundle(file),
    encoding: "utf8",
  });
  if (result.error) {
    console.error(`Could not run psql: ${result.error.message}`);
    process.exit(2);
  }
  const oks = result.stdout.split("\n").filter((line) => line.startsWith("ok: "));
  const passed = result.status === 0;
  checks += oks.length;
  console.log(`${passed ? "PASS" : "FAIL"}  ${file}  (${oks.length} checks)`);
  for (const line of oks) console.log(`      ${line}`);
  if (!passed) {
    failed += 1;
    console.log(result.stderr.trim().split("\n").map((l) => `      ${l}`).join("\n"));
  }
}

console.log(`\n${tests.length - failed} of ${tests.length} test files passed, ${checks} checks.`);
process.exit(failed === 0 ? 0 : 1);
