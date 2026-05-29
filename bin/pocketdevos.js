#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(__dirname, '../server/src/index.ts');
const distEntry = resolve(__dirname, '../dist/server/index.js');

// Use built version if available, otherwise tsx for dev
if (existsSync(distEntry)) {
  spawn('node', [distEntry, ...process.argv.slice(2)], { stdio: 'inherit' });
} else {
  spawn('npx', ['tsx', serverEntry, ...process.argv.slice(2)], { stdio: 'inherit' });
}
