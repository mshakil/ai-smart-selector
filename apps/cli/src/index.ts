import { Command } from 'commander';
import { startCommand } from './commands/start.js';
import { configureCommand } from './commands/configure.js';
import { installExtensionCommand } from './commands/install-extension.js';

const program = new Command()
  .name('smartlocator')
  .description('AI-assisted selector intelligence for test automation')
  .version('0.1.2');

program.addCommand(startCommand());
program.addCommand(configureCommand());
program.addCommand(installExtensionCommand());
program.parse(process.argv);
