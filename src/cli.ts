import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initCommand } from './commands/init.js';
import { searchCommand } from './commands/search.js';
import { graphCommand } from './commands/graph.js';
import { statusCommand } from './commands/status.js';
import { syncCommand } from './commands/sync.js';
import { skillCommand } from './commands/skill.js';

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const { version } = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

const program = new Command();

program
  .name('llm-wiki')
  .description('Agent-native LLM Wiki — AI-maintained knowledge base')
  .version(version);

program.addCommand(initCommand);
program.addCommand(searchCommand);
program.addCommand(graphCommand);
program.addCommand(statusCommand);
program.addCommand(syncCommand);
program.addCommand(skillCommand);

program.parse();
