import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) {
        return true;
      }
    } catch {
      // ignore until server starts listening
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

async function main() {
  // Ensure Next.js production build exists for static artifact tests
  const buildDir = join(process.cwd(), '.next');
  if (!existsSync(buildDir)) {
    console.log('Building application before running tests...');
    const buildProc = spawn('npx', ['next', 'build'], { stdio: 'inherit' });
    const code = await new Promise((resolve) => buildProc.on('exit', resolve));
    if (code !== 0) {
      process.exit(code || 1);
    }
  }

  // Check if a server is already active on port 3000
  let isAlreadyRunning = false;
  try {
    const probe = await fetch('http://localhost:3000/', { redirect: 'manual' });
    isAlreadyRunning = probe.status < 500;
  } catch {
    isAlreadyRunning = false;
  }

  let serverProc = null;
  if (!isAlreadyRunning) {
    serverProc = spawn('npx', ['next', 'start', '-p', '3000'], {
      stdio: ['ignore', 'ignore', 'pipe'],
      detached: false,
    });

    const isReady = await waitForServer('http://localhost:3000/');
    if (!isReady) {
      console.error('Failed to start Next.js test server on port 3000');
      if (serverProc) serverProc.kill();
      process.exit(1);
    }
  }

  const testProc = spawn(
    process.execPath,
    ['--test', 'tests/planner.test.mjs', 'tests/auth.test.mjs'],
    { stdio: 'inherit' }
  );

  const exitCode = await new Promise((resolve) => testProc.on('exit', resolve));

  if (serverProc) {
    serverProc.kill('SIGTERM');
  }

  process.exit(exitCode || 0);
}

main().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
