import { spawnSync } from "node:child_process";

console.log("=== Running Isolated Content Planner Supabase pgTAP Test Suite ===");

// Check if local Supabase stack is running
const status = spawnSync("npx", ["supabase", "status"], {
  encoding: "utf8",
});

if (status.status !== 0) {
  console.log("Local Supabase stack is not running. Starting isolated Supabase local stack (npx supabase start)...");
  const start = spawnSync("npx", ["supabase", "start"], {
    stdio: "inherit",
  });

  if (start.status !== 0) {
    console.error("\n[BLOCKED] Docker was unable to start the Content Planner local Supabase stack.");
    console.error("Do not borrow or use unrelated project containers.");
    process.exit(1);
  }
}

// Reset local isolated database
console.log("Resetting isolated local database (npx supabase db reset --local)...");
const reset = spawnSync("npx", ["supabase", "db", "reset", "--local"], {
  stdio: "inherit",
});

if (reset.status !== 0) {
  console.error("[FAILED] Local Supabase database reset failed.");
  process.exit(1);
}

// Execute pgTAP tests
console.log("Executing pgTAP tests on isolated local database (npx supabase test db --local)...");
const test = spawnSync("npx", ["supabase", "test", "db", "--local"], {
  stdio: "inherit",
});

if (test.status !== 0) {
  console.error("[FAILED] pgTAP tests failed.");
  process.exit(1);
}

console.log("\n[SUCCESS] All Content Planner pgTAP database tests passed on isolated local Supabase stack.");
