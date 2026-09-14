import { execSync } from "node:child_process";

async function runDbTests() {
  console.log("=== Running Local Supabase / Postgres pgTAP Policy Tests ===");

  let container = "investment-postgres-1";
  try {
    const running = execSync("docker ps --filter name=" + container + " --format {{.Names}}", { encoding: "utf8" }).trim();
    if (!running) {
      const fallback = execSync("docker ps --filter ancestor=postgres:17-alpine --format {{.Names}}", { encoding: "utf8" }).trim();
      if (fallback) {
        container = fallback.split("\n")[0];
      } else {
        console.error("No running local Postgres container found. Start Postgres with Docker to execute pgTAP tests.");
        process.exit(1);
      }
    }
  } catch (err) {
    console.error("Docker command failed. Is Docker running?", err.message);
    process.exit(1);
  }

  console.log("Found Postgres container: " + container);

  try {
    console.log("Resetting test database: content_planner_test...");
    execSync("docker exec -e PGPASSWORD=change-me " + container + " psql -U autotrading -d postgres -c \"DROP DATABASE IF EXISTS content_planner_test;\"", { stdio: "pipe" });
    execSync("docker exec -e PGPASSWORD=change-me " + container + " psql -U autotrading -d postgres -c \"CREATE DATABASE content_planner_test;\"", { stdio: "pipe" });

    console.log("Copying setup and migrations to container...");
    execSync("docker cp supabase/tests/database/setup-local-db.sql " + container + ":/tmp/setup.sql", { stdio: "pipe" });
    execSync("docker cp supabase/migrations/20260914000000_create_mvp_schema.sql " + container + ":/tmp/m1.sql", { stdio: "pipe" });
    execSync("docker cp supabase/migrations/20260914000001_create_storage_and_user_trigger.sql " + container + ":/tmp/m2.sql", { stdio: "pipe" });
    execSync("docker cp supabase/tests/database/rls.test.sql " + container + ":/tmp/rls.test.sql", { stdio: "pipe" });

    console.log("Applying mock auth & storage schemas...");
    execSync("docker exec -e PGPASSWORD=change-me " + container + " psql -v ON_ERROR_STOP=1 -q -U autotrading -d content_planner_test -f /tmp/setup.sql", { stdio: "pipe" });

    console.log("Applying Migration 1 (MVP Schema & Policies)...");
    execSync("docker exec -e PGPASSWORD=change-me " + container + " psql -v ON_ERROR_STOP=1 -q -U autotrading -d content_planner_test -f /tmp/m1.sql", { stdio: "pipe" });

    console.log("Applying Migration 2 (Storage & User Provisioning Trigger)...");
    execSync("docker exec -e PGPASSWORD=change-me " + container + " psql -v ON_ERROR_STOP=1 -q -U autotrading -d content_planner_test -f /tmp/m2.sql", { stdio: "pipe" });

    console.log("Executing pgTAP test suite (supabase/tests/database/rls.test.sql)...");
    const output = execSync("docker exec -e PGPASSWORD=change-me " + container + " psql -v ON_ERROR_STOP=1 -q -X -t -A -U autotrading -d content_planner_test -f /tmp/rls.test.sql", { encoding: "utf8" });

    const lines = output.split("\n").filter(l => l.startsWith("ok ") || l.startsWith("not ok ") || l.startsWith("1.."));
    lines.forEach(l => console.log(l));

    const totalPassed = lines.filter(l => l.startsWith("ok ")).length;
    const failures = lines.filter(l => l.startsWith("not ok "));

    if (failures.length > 0) {
      console.error("pgTAP tests failed: " + failures.length + " assertion(s) failed.");
      process.exit(1);
    }

    if (totalPassed !== 26) {
      console.error("Expected 26 passing assertions, but received " + totalPassed + ".");
      process.exit(1);
    }

    console.log("All " + totalPassed + " pgTAP database policy and RLS assertions passed successfully.");
  } catch (err) {
    console.error("Database test execution failed:", err.message);
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(1);
  }
}

runDbTests();
