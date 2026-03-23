import { execFileSync, spawn } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  watch,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const command = process.argv[2] ?? 'dev';
const extraArgs = process.argv.slice(3);
const mirroredTopLevelExcludedEntries = new Set(['dist', '.git']);
const watchedExcludedEntries = new Set(['node_modules', 'dist', '.git']);

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

  throw new Error('No available drive letter found for Vite path mapping.');
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
    // Ignore cleanup failures so they do not mask the actual Vite result.
  }
}

function isInsideExcludedEntry(relativePath) {
  if (!relativePath) {
    return false;
  }

  const firstSegment = relativePath.split(path.sep)[0];
  return watchedExcludedEntries.has(firstSegment);
}

function ensureParentDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function syncEntry(sourcePath, targetPath) {
  if (!existsSync(sourcePath)) {
    rmSync(targetPath, { recursive: true, force: true });
    return;
  }

  const sourceStat = lstatSync(sourcePath);

  if (sourceStat.isDirectory()) {
    rmSync(targetPath, { recursive: true, force: true });
    mkdirSync(path.dirname(targetPath), { recursive: true });
    cpSync(sourcePath, targetPath, { recursive: true, force: true });
    return;
  }

  if (sourceStat.isSymbolicLink()) {
    const linkTarget = readlinkSync(sourcePath);
    rmSync(targetPath, { recursive: true, force: true });
    ensureParentDir(targetPath);
    symlinkSync(linkTarget, targetPath, 'junction');
    return;
  }

  ensureParentDir(targetPath);
  copyFileSync(sourcePath, targetPath);
}

function prepareMirrorWorkspace() {
  const mirrorRoot = path.join(
    os.tmpdir(),
    'rag-copilot-frontend-runner',
    `workspace-${process.pid}-${Date.now()}`,
  );
  mkdirSync(mirrorRoot, { recursive: true });

  for (const entry of readdirSync(projectRoot)) {
    if (mirroredTopLevelExcludedEntries.has(entry)) {
      continue;
    }

    syncEntry(path.join(projectRoot, entry), path.join(mirrorRoot, entry));
  }

  return mirrorRoot;
}

function watchMirrorChanges(mirrorRoot) {
  return watch(projectRoot, { recursive: true }, (_eventType, filename) => {
    if (!filename) {
      return;
    }

    const relativePath = path.normalize(filename.toString());
    if (isInsideExcludedEntry(relativePath)) {
      return;
    }

    const sourcePath = path.join(projectRoot, relativePath);
    const targetPath = path.join(mirrorRoot, relativePath);

    try {
      syncEntry(sourcePath, targetPath);
    } catch (error) {
      console.warn(`[vite-runner] Failed to sync ${relativePath}:`, error.message);
    }
  });
}

function resolveWorkingDirectory() {
  if (process.platform !== 'win32' || !isNonAsciiPath(projectRoot)) {
    return { cwd: projectRoot, cleanup: () => {} };
  }

  if (command === 'dev') {
    const mirrorRoot = prepareMirrorWorkspace();
    const watcher = watchMirrorChanges(mirrorRoot);
    console.log(`[vite-runner] Detected non-ASCII project path, using mirrored workspace: ${mirrorRoot}`);

    return {
      cwd: mirrorRoot,
      cleanup: () => {
        watcher.close();
        rmSync(mirrorRoot, { recursive: true, force: true });
      },
    };
  }

  const drive = getAvailableDriveLetter();
  execFileSync('subst', [drive, workspaceRoot], {
    stdio: 'ignore',
  });

  const mappedPath = path.join(`${drive}\\`, path.basename(projectRoot));
  console.log(`[vite-runner] Detected non-ASCII project path, using drive mapping: ${mappedPath}`);

  return {
    cwd: mappedPath,
    cleanup: () => releaseMappedDrive(drive),
  };
}

const { cwd, cleanup } = resolveWorkingDirectory();
const viteBin = path.join(cwd, 'node_modules', 'vite', 'bin', 'vite.js');

if (!existsSync(viteBin)) {
  console.error('[vite-runner] Vite not found. Please run `npm install` first.');
  process.exit(1);
}

const args = [viteBin, command, ...extraArgs];

if ((command === 'dev' || command === 'preview') && !extraArgs.includes('--host')) {
  args.push('--host', '0.0.0.0');
}

const child = spawn(process.execPath, args, {
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
  console.error('[vite-runner] Failed to start Vite:', error);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    cleanup();
    child.kill(signal);
  });
}
