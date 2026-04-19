import { Command } from 'commander';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSkillsDir, listSkills, installSkillsTo } from '../lib/skills.js';

export const skillCommand = new Command('skill')
  .description('Manage AI agent skills');

skillCommand
  .command('install')
  .description('Install/upgrade skills in your AI agent workspace')
  .option('--claude', 'install to .claude/skills/ only')
  .option('--codex', 'install to .agents/skills/ only')
  .option('--dir <path>', 'workspace directory (default: cwd)')
  .action((opts: { claude?: boolean; codex?: boolean; dir?: string }) => {
    const workspace = opts.dir || process.cwd();
    const both = !opts.claude && !opts.codex;

    if (both || opts.claude) {
      const dir = join(workspace, '.claude', 'skills');
      const { installed } = installSkillsTo(dir);
      console.log(`Installed ${installed.length} skill${installed.length === 1 ? '' : 's'} to ${dir}/`);
      for (const file of installed) console.log(`  ${file.replace('.md', '')}`);
    }

    if (both || opts.codex) {
      const dir = join(workspace, '.agents', 'skills');
      const { installed } = installSkillsTo(dir);
      if (both) console.log('');
      console.log(`Installed ${installed.length} skill${installed.length === 1 ? '' : 's'} to ${dir}/`);
      for (const file of installed) console.log(`  ${file.replace('.md', '')}`);
    }
  });

skillCommand
  .command('show')
  .description('Print skill content to stdout')
  .argument('<name>', 'skill name')
  .action((name: string) => {
    const skillsDir = getSkillsDir();
    if (!existsSync(skillsDir)) {
      console.error('Error: Skills directory not found. Package may be corrupted.');
      process.exit(1);
    }

    const skillPath = join(skillsDir, `${name}.md`);
    if (!existsSync(skillPath)) {
      console.error(`Error: Skill "${name}" not found.`);
      console.error(`Available: ${listSkills(skillsDir).map(f => f.replace('.md', '')).join(', ')}`);
      process.exit(1);
    }

    console.log(readFileSync(skillPath, 'utf-8'));
  });

skillCommand
  .command('list')
  .description('List all available skills')
  .action(() => {
    const skillsDir = getSkillsDir();
    if (!existsSync(skillsDir)) {
      console.error('Error: Skills directory not found. Package may be corrupted.');
      process.exit(1);
    }

    const files = listSkills(skillsDir);
    console.log('Available skills:');
    for (const file of files) {
      console.log(`  ${file.replace(/\.md$/, '')}`);
    }
    console.log('');
    console.log('Install all:  llm-wiki skill install');
    console.log('Show one:     llm-wiki skill show <name>');
  });

skillCommand.action(() => {
  skillCommand.commands.find(c => c.name() === 'list')!.parse([], { from: 'user' });
});
