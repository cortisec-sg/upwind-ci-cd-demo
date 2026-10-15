/**
 * Opt-in vulnerability example. Run ONLY on a temporary demo branch.
 * Adds a vulnerable dependency and modifies IaC for static scanning.
 * Do not deploy this branch to any environment.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = resolve(root, 'kubernetes/deployment.yaml');
const terraform = resolve(root, 'terraform/main.tf');
const mode = process.argv[2];
if (!['add','fix'].includes(mode)) process.exit(2);
function change(file, from, to) {
  const current = readFileSync(file, 'utf8');
  if (current.includes(to) && !current.includes(from)) return;
  if (!current.includes(from)) throw Error('Cannot locate expected text: ' + from);
  writeFileSync(file, current.replace(from, to));
}
// Invoke npm through Node instead of spawning npm.cmd directly (Node 24 / Windows).
const npmCli = process.env.npm_execpath ||
  resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
function runNpm(args) {
  execFileSync(process.execPath, [npmCli, ...args], { cwd: root, stdio: 'inherit' });
}
if (mode === 'add') {
  runNpm(['install','--save-exact','--ignore-scripts','lodash@4.17.20']);
  change(manifest, 'readOnlyRootFilesystem: true', 'readOnlyRootFilesystem: false');
  change(terraform, 'block_public_acls = true', 'block_public_acls = false');
  console.log('Demo risks added. Open a PR. Do NOT deploy this branch.');
} else {
  runNpm(['uninstall','--ignore-scripts','lodash']);
  change(manifest, 'readOnlyRootFilesystem: false', 'readOnlyRootFilesystem: true');
  change(terraform, 'block_public_acls = false', 'block_public_acls = true');
  console.log('Demo risks removed. Commit the fixes to the same PR.');
}
