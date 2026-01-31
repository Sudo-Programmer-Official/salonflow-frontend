#!/usr/bin/env node

// Simple helper to strip the background from an image using the `rembg` CLI.
// Usage:
//   node scripts/remove-background.mjs [inputPath] [outputPath]
// Defaults target the public folder: facebook-app-icon -> facebook-app-icon-transparent.png

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const [inputArg, outputArg] = process.argv.slice(2);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultInput = resolve(scriptDir, '../public/facebook-app-icon.png');
const defaultOutput = resolve(scriptDir, '../public/facebook-app-icon-transparent.png');

const inputPath = inputArg ? resolve(process.cwd(), inputArg) : defaultInput;
const outputPath = outputArg ? resolve(process.cwd(), outputArg) : defaultOutput;

if (!existsSync(inputPath)) {
  console.error(`Input image not found at ${inputPath}`);
  console.error('Place your 1024x1024 source image there or pass a custom path.');
  process.exit(1);
}

// Ensure destination directory exists before running rembg.
mkdirSync(dirname(outputPath), { recursive: true });

// Sanity check: make sure rembg is importable in the current python3 env.
const probe = spawnSync('python3', ['-c', 'import rembg'], { stdio: 'ignore' });
if (probe.status !== 0 || probe.error) {
  console.error('The rembg library is missing. Install it with CPU + CLI extras:');
  console.error('  python3 -m pip install --user \"rembg[cpu,cli]\"');
  console.error('If you use a virtualenv/conda, activate it and reinstall there.');
  process.exit(1);
}

const inputLabel = relative(process.cwd(), inputPath);
console.log(`Removing background from ${inputLabel} ...`);

const pyRunner = `
import sys
from pathlib import Path
from rembg import remove, new_session

input_path = Path(sys.argv[1])
output_path = Path(sys.argv[2])

data = input_path.read_bytes()
session = new_session('u2net')
output_path.write_bytes(remove(data, session=session))
`;

const result = spawnSync('python3', ['-c', pyRunner, inputPath, outputPath], {
  stdio: 'inherit',
});

if (result.error || result.status !== 0) {
  console.error('rembg failed. Double-check the input path and that rembg is installed.');
  process.exit(result.status ?? 1);
}

console.log(`Transparent image saved to ${relative(process.cwd(), outputPath)}`);
console.log('Use this PNG for the Facebook app submission — resolution is preserved.');
