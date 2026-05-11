import { existsSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function getSkillsDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const packageRoot = dirname(dirname(currentFile));
  return join(packageRoot, 'skills');
}

// A "skill" is a subdirectory of `skillsDir` containing a `SKILL.md` entry
// point. This matches the Agent Skills specification:
// https://agentskills.io/specification
export function listSkills(skillsDir: string): string[] {
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(skillsDir, d.name, 'SKILL.md')))
    .map(d => d.name)
    .sort();
}

export interface InstallResult {
  installed: string[];
  skipped: string[];
}

function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      copyFileSync(srcPath, destPath);
    }
  }
}

export function installSkillsTo(targetDir: string, overwrite = true): InstallResult {
  const skillsDir = getSkillsDir();
  if (!existsSync(skillsDir)) {
    throw new Error('Skills directory not found. Package may be corrupted.');
  }
  mkdirSync(targetDir, { recursive: true });
  const skills = listSkills(skillsDir);
  const installed: string[] = [];
  const skipped: string[] = [];
  for (const name of skills) {
    const destSkillDir = join(targetDir, name);
    // Treat the skill as already installed if its SKILL.md entry point
    // exists. With `overwrite=false` this preserves user-customized skills
    // (and any sibling files they added under the same directory).
    if (!overwrite && existsSync(join(destSkillDir, 'SKILL.md'))) {
      skipped.push(name);
      continue;
    }
    copyDirRecursive(join(skillsDir, name), destSkillDir);
    installed.push(name);
  }
  return { installed, skipped };
}
