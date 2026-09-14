#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_EXCEL = "/Users/nack/Downloads/Content Planner.xlsx";
const DEFAULT_CSV = "/Users/nack/Downloads/Gypstore 3a3f713029ef804d8a70e7bc36247cfb.csv";

const excelPath = process.argv[2] || DEFAULT_EXCEL;
const csvPath = process.argv[3] || DEFAULT_CSV;

console.log("================================================================");
console.log("             OWNER SOURCE FILES AUDIT (DRY-RUN ONLY)            ");
console.log("================================================================");

if (!existsSync(excelPath) || !existsSync(csvPath)) {
  console.log("One or both source files were not found:");
  console.log("  Excel:  " + excelPath + " [" + (existsSync(excelPath) ? "FOUND" : "NOT FOUND") + "]");
  console.log("  Notion: " + csvPath + " [" + (existsSync(csvPath) ? "FOUND" : "NOT FOUND") + "]");
  console.log("");
  console.log("To audit your real files, place them in the path above or pass arguments:");
  console.log("  node scripts/audit-sources.mjs <excel-path> <csv-path>");
  console.log("");
  process.exit(0);
}

console.log("Running safe dry-run audit on owner source files...");
const proc = spawnSync(
  process.execPath,
  [
    resolve(process.cwd(), "scripts/import-data.mjs"),
    "--excel", excelPath,
    "--csv", csvPath,
  ],
  { stdio: "inherit" }
);

process.exit(proc.status ?? 0);
