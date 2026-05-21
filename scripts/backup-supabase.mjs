#!/usr/bin/env node
// Full data backup via Supabase REST API using SERVICE_ROLE_KEY.
// Run: node scripts/backup-supabase.mjs
// Output: backups/<timestamp>/<table>.json + manifest.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(".env.local");
loadEnv(".env");

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const TABLES = [
  "profiles",
  "user_permissions",
  "clients",
  "client_activities",
  "tasks",
  "activity_log",
  "invoices",
  "invoice_items",
  "products",
  "suppliers",
  "product_suppliers",
  "stock_movements",
  "affiliates",
  "affiliate_sales",
  "affiliate_payouts",
  "shopify_connections",
  "shopify_orders",
  "shopify_sync_runs",
  "newsletter_subscribers",
  "newsletter_campaigns",
  "faq_entries",
];

const PAGE = 1000;
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  Accept: "application/json",
};

async function fetchAll(table) {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + PAGE - 1;
    const url = `${URL_BASE}/rest/v1/${table}?select=*`;
    const res = await fetch(url, {
      headers: { ...headers, Range: `${from}-${to}`, "Range-Unit": "items", Prefer: "count=exact" },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${table} HTTP ${res.status}: ${body}`);
    }
    const batch = await res.json();
    rows.push(...batch);
    const contentRange = res.headers.get("content-range") || "";
    const total = Number(contentRange.split("/")[1]);
    if (batch.length < PAGE || rows.length >= total) break;
    from += PAGE;
  }
  return rows;
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(root, "backups", stamp);
fs.mkdirSync(outDir, { recursive: true });

const manifest = { timestamp: stamp, supabase_url: URL_BASE, tables: {} };
let totalRows = 0;
let failed = 0;

for (const table of TABLES) {
  process.stdout.write(`  ${table.padEnd(28)}`);
  try {
    const rows = await fetchAll(table);
    fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows, null, 2));
    manifest.tables[table] = { rows: rows.length, ok: true };
    totalRows += rows.length;
    console.log(`${String(rows.length).padStart(6)} rows`);
  } catch (e) {
    manifest.tables[table] = { rows: 0, ok: false, error: String(e.message || e) };
    failed += 1;
    console.log(`FAILED: ${e.message || e}`);
  }
}

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nBackup saved to: ${outDir}`);
console.log(`Total: ${totalRows} rows across ${TABLES.length - failed}/${TABLES.length} tables`);
if (failed) process.exit(2);
