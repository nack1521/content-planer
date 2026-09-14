import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function waitForServer(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status < 500) {
        return true;
      }
    } catch {
      // wait until server listens
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

function runCommand(command, args, options = {}) {
  const res = spawnSync(command, args, { stdio: "inherit", ...options });
  if (res.status !== 0) {
    console.error(`Command failed (${command} ${args.join(" ")}): exit code ${res.status}`);
    process.exit(res.status || 1);
  }
  return res;
}

async function main() {
  console.log("=== 1. Verifying and Preparing Isolated Local Supabase Environment ===");
  const statusCheck = spawnSync("npx", ["supabase", "status"], { encoding: "utf8" });
  if (statusCheck.status !== 0) {
    console.log("Starting local isolated Supabase stack (npx supabase start)...");
    runCommand("npx", ["supabase", "start"]);
  }

  console.log("Resetting isolated database schema and running migrations (npx supabase db reset --local)...");
  runCommand("npx", ["supabase", "db", "reset", "--local"]);

  console.log("Executing pgTAP database tests (npx supabase test db --local)...");
  runCommand("npx", ["supabase", "test", "db", "--local"]);

  // Overwrite environment variables strictly from local Supabase stack
  const statusProc = spawnSync("npx", ["supabase", "status", "-o", "json"], { encoding: "utf8" });
  if (statusProc.status !== 0 || !statusProc.stdout) {
    console.error("\n[BLOCKED] Local Supabase stack is not running or status could not be queried.");
    process.exit(1);
  }
  const statusJson = JSON.parse(statusProc.stdout);
  process.env.NEXT_PUBLIC_SUPABASE_URL = statusJson.API_URL || "http://127.0.0.1:54321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = statusJson.PUBLISHABLE_KEY || statusJson.ANON_KEY;

  // Strict local hostname verification
  const parsedUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (parsedUrl.hostname !== "127.0.0.1" && parsedUrl.hostname !== "localhost") {
    console.error(`\n[SECURITY ABORT] Test environment must resolve strictly to 127.0.0.1 or localhost, got: ${parsedUrl.hostname}`);
    process.exit(1);
  }
  console.log(`Verified local Supabase test environment: ${parsedUrl.hostname}:${parsedUrl.port || "default"}`);

  console.log("\n=== 2. Running Production Domain & Validation Suites ===");
  runCommand(process.execPath, ["tests/workflow.test.mjs"]);

  console.log("\n=== 3. Running Accessibility & Keyboard Navigation Suite ===");
  runCommand(process.execPath, ["tests/accessibility.test.mjs"]);

  console.log("\n=== 4. Running Localization & String Scanner Suite ===");
  runCommand(process.execPath, ["tests/localization-scanner.test.mjs"]);

  console.log("\n=== 5. Running Production Importer CLI & Idempotency Suite ===");
  runCommand(process.execPath, ["tests/import.test.mjs"]);

  console.log("\n=== 6. Running Authenticated Server Actions & Atomic Rollback Suite ===");
  runCommand(process.execPath, ["--loader", "./tests/test-loader.mjs", "tests/actions.test.mjs"]);

  console.log("\n=== 7. Building Content Planner Application from Current Source ===");
  runCommand("npx", ["next", "build"], { env: { ...process.env, NODE_ENV: "production" } });

  console.log("\n=== 8. Running Live Server & HTTP Integration Suites ===");
  const testPort = await getFreePort();
  const baseUrl = `http://127.0.0.1:${testPort}`;
  console.log(`Starting isolated Content Planner test server on ${baseUrl}...`);

  let serverProc = null;
  try {
    serverProc = spawn("npx", ["next", "start", "-p", String(testPort), "-H", "127.0.0.1"], {
      stdio: ["ignore", "ignore", "pipe"],
      detached: false,
    });

    const isReady = await waitForServer(baseUrl, 20000);
    if (!isReady) {
      throw new Error(`Test server failed to start or respond on ${baseUrl}`);
    }

    console.log(`Running live server tests against ${baseUrl}...`);
    const testProc = spawn(
      process.execPath,
      ["--experimental-strip-types", "--test", "tests/planner.test.mjs", "tests/auth.test.mjs"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          TEST_BASE_URL: baseUrl,
        },
      }
    );

    const testExitCode = await new Promise((resolve) => testProc.on("exit", resolve));
    if (testExitCode !== 0) {
      process.exit(testExitCode || 1);
    }
  } finally {
    if (serverProc) {
      try {
        serverProc.kill("SIGTERM");
      } catch {
        // ignore cleanup error
      }
    }
  }

  console.log("\n=== [SUCCESS] ALL CLEAN-ENVIRONMENT CHECKS AND TEST SUITES PASSED ===");
}

main().catch((err) => {
  console.error("Test runner failure:", err);
  process.exit(1);
});
