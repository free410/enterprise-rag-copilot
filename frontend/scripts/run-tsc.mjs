import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const extraArgs = process.argv.slice(2);

function isNonAsciiPath(targetPath) {
  return /[^\u0000-\u007f]/.test(targetPath);
}

function getAvailableDriveLetter() {
  const candidates = 'ZYXWVUTSRQPONMLKJIHGFED'.split('');

  for (const letter of candidates) {
    if (!existsSync(`${letter}:\\`)) {
      return `${letter}:`;
    }
  }

  throw new Error('No available drive letter found for TypeScript path mapping.');
}

function releaseMappedDrive(drive) {
  if (!drive) {
    return;
  }

  try {
    execFileSync('subst', [drive, '/D'], {
      stdio: 'ignore',
    });
  } catch {
    // Ignore cleanup failures so they do not mask the actual TypeScript result.
  }
}

function resolveWorkingDirectory() {
  if (process.platform !== 'win32' || !isNonAsciiPath(projectRoot)) {
    return { cwd: projectRoot, cleanup: () => {} };
  }

  const drive = getAvailableDriveLetter();
  execFileSync('subst', [drive, workspaceRoot], {
    stdio: 'ignore',
  });

  return {
    cwd: path.join(`${drive}\\`, path.basename(projectRoot)),
    cleanup: () => releaseMappedDrive(drive),
  };
}

const { cwd, cleanup } = resolveWorkingDirectory();
const tscBin = path.join(cwd, 'node_modules', 'typescript', 'bin', 'tsc');

if (!existsSync(tscBin)) {
  console.error('[tsc-runner] TypeScript not found. Please run `npm install` first.');
  process.exit(1);
}

const child = spawn(process.execPath, [tscBin, ...extraArgs], {
  cwd,
  stdio: 'inherit',
  env: {
    ...process.env,
    FORCE_COLOR: '1',
  },
});

child.on('exit', (code) => {
  cleanup();
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  cleanup();
  console.error('[tsc-runner] Failed to start TypeScript:', error);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    cleanup();
    child.kill(signal);
  });
}
