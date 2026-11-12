/**
 * project_root.mjs - Robust repository root resolution helper
 *
 * Ensures that all E2E scripts resolve file paths correctly whether executed from:
 * - Repository root: e:\SmartWardAI
 * - Frontend directory: e:\SmartWardAI\frontend
 * - Any subfolder: e:\SmartWardAI\frontend\scripts\e2e\...
 */

import fs from 'node:fs';
import path from 'node:path';

export function getProjectRoot() {
  let curr = path.resolve(process.cwd());
  while (curr && curr !== path.dirname(curr)) {
    if (
      fs.existsSync(path.join(curr, 'docker-compose.yml')) &&
      fs.existsSync(path.join(curr, 'backend')) &&
      fs.existsSync(path.join(curr, 'frontend'))
    ) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return path.resolve(process.cwd());
}

export const PROJECT_ROOT = getProjectRoot();
