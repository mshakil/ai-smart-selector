import { Command } from 'commander';
import { startCommand } from './commands/start.js';
import { configureCommand } from './commands/configure.js';

const program = new Command()
  .name('smartlocator')
  .description('AI-assisted selector intelligence for test automation')
  .version('0.1.0');

program.addCommand(startCommand());
program.addCommand(configureCommand());
program.parse(process.argv);
