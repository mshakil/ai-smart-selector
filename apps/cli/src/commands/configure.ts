import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, saveConfig, maskKey, type AIProviderName } from '../config.js';

export function configureCommand(): Command {
  const cmd = new Command('configure')
    .description('Set AI provider and API key for selector generation');

  cmd
    .command('set')
    .description('Set provider and API key')
    .requiredOption('--provider <name>', 'AI provider: openai | claude')
    .requiredOption('--key <apiKey>', 'API key for the provider')
    .action((opts: { provider: string; key: string }) => {
      const provider = opts.provider as AIProviderName;
      if (provider !== 'openai' && provider !== 'claude') {
        console.error(chalk.red(`Unknown provider "${provider}". Use: openai | claude`));
        process.exit(1);
      }

      const patch =
        provider === 'openai'
          ? { provider, openaiKey: opts.key }
          : { provider, claudeKey: opts.key };

      saveConfig(patch);
      console.log(chalk.green(`\nSaved: provider=${provider}, key=${maskKey(opts.key)}\n`));
    });

  cmd
    .command('show')
    .description('Show current configuration')
    .action(() => {
      const config = loadConfig();
      const key = config.provider === 'openai' ? config.openaiKey : config.claudeKey;
      console.log(`\n  provider : ${chalk.cyan(config.provider)}`);
      if (key) console.log(`  key      : ${chalk.gray(maskKey(key))}`);
      else console.log(`  key      : ${chalk.gray('not set')}`);
      console.log('');
    });

  cmd
    .command('clear')
    .description('Disable AI and remove stored keys')
    .action(() => {
      saveConfig({ provider: 'none', openaiKey: undefined, claudeKey: undefined });
      console.log(chalk.yellow('\nAI disabled and keys removed.\n'));
    });

  return cmd;
}
