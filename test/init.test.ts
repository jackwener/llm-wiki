import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI = join(import.meta.dirname, '..', 'dist', 'cli.js');
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `llm-wiki-init-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('init command', () => {
  it('should create vault structure', () => {
    execSync(`node ${CLI} init`, { cwd: testDir });
    expect(existsSync(join(testDir, 'wiki'))).toBe(true);
    expect(existsSync(join(testDir, 'sources'))).toBe(true);
    expect(existsSync(join(testDir, 'purpose.md'))).toBe(true);
    expect(existsSync(join(testDir, 'schema.md'))).toBe(true);
    expect(existsSync(join(testDir, 'log.md'))).toBe(true);
    expect(existsSync(join(testDir, '.llm-wiki/config.toml'))).toBe(true);
  });

  it('should generate agent bootstrap files', () => {
    execSync(`node ${CLI} init`, { cwd: testDir });
    expect(existsSync(join(testDir, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(join(testDir, 'AGENTS.md'))).toBe(true);
  });

  it('should auto-install skills to both agent dirs', () => {
    execSync(`node ${CLI} init`, { cwd: testDir });
    const claudeSkill = join(testDir, '.claude/skills/llm-wiki.md');
    const agentsSkill = join(testDir, '.agents/skills/llm-wiki.md');
    expect(existsSync(claudeSkill)).toBe(true);
    expect(existsSync(agentsSkill)).toBe(true);
    // Content must match (not just empty file)
    const claudeContent = readFileSync(claudeSkill, 'utf-8');
    const agentsContent = readFileSync(agentsSkill, 'utf-8');
    expect(claudeContent.length).toBeGreaterThan(100);
    expect(claudeContent).toEqual(agentsContent);
  });

  it('should not clobber pre-existing customized skill files', () => {
    const claudeSkillDir = join(testDir, '.claude/skills');
    mkdirSync(claudeSkillDir, { recursive: true });
    const customContent = '# My Custom Skill\n\nDo not overwrite me.\n';
    writeFileSync(join(claudeSkillDir, 'llm-wiki.md'), customContent);

    execSync(`node ${CLI} init`, { cwd: testDir });

    expect(readFileSync(join(claudeSkillDir, 'llm-wiki.md'), 'utf-8')).toEqual(customContent);
    // Fresh dir still gets the bundled skill
    expect(existsSync(join(testDir, '.agents/skills/llm-wiki.md'))).toBe(true);
  });

  it('should not overwrite existing files', () => {
    execSync(`node ${CLI} init`, { cwd: testDir });
    // Should fail if already initialized
    expect(() => execSync(`node ${CLI} init`, { cwd: testDir, stdio: 'pipe' })).toThrow();
  });
});
