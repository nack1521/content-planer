import { spawn } from "node:child_process";
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

async function main() {
  // Always build application from current source before running tests
  console.log("Building Content Planner application from current source...");
  const buildProc = spawn("npx", ["next", "build"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });

  const buildCode = await new Promise((resolve) => buildProc.on("exit", resolve));
  if (buildCode !== 0) {
    console.error(`Build failed with exit code ${buildCode}`);
    process.exit(buildCode || 1);
  }

  // Get dedicated test port - NEVER reuse port 3000 or arbitrary processes
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

    console.log(`Running tests against isolated server (${baseUrl})...`);
    const testProc = spawn(
      process.execPath,
      ["--test", "tests/planner.test.mjs", "tests/auth.test.mjs"],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          TEST_BASE_URL: baseUrl,
        },
      }
    );

    const testExitCode = await new Promise((resolve) => testProc.on("exit", resolve));
    process.exitCode = testExitCode || 0;
  } finally {
    // ALWAYS terminate the spawned server in a finally block
    if (serverProc) {
      try {
        serverProc.kill("SIGTERM");
      } catch {
        // ignore cleanup error
      }
    }
  }
}

main().catch((err) => {
  console.error("Test runner failure:", err);
  process.exit(1);
});
