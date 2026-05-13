import { Command } from 'commander';
import chalk from 'chalk';
import { startAgent, WS_PORT } from '../server/agent.js';
import { initRepository } from '../server/repository.js';
import { loadConfig, getActiveApiKey } from '../config.js';
import { log } from '../logger.js';
import { PatchManager } from '@smartlocator/engine';
import type { AIProvider } from '@smartlocator/ai-core';

export function startCommand(): Command {
  return new Command('start')
    .description('Start the SmartLocator local agent')
    .option('--no-ai', 'Disable AI fallback even if a key is configured')
    .option('--root <path>', 'Root directory of the test repository', process.cwd())
    .action(async (opts: { ai: boolean; root: string }) => {
      console.log(chalk.cyan('\nSmartLocator AI\n'));

      let aiProvider: AIProvider | undefined;

      if (opts.ai) {
        const config = loadConfig();
        const apiKey = getActiveApiKey(config);

        if (apiKey) {
          try {
            if (config.provider === 'openai') {
              const { OpenAIProvider } = await import('@smartlocator/ai-core');
              aiProvider = new OpenAIProvider(apiKey);
            } else if (config.provider === 'claude') {
              const { ClaudeProvider } = await import('@smartlocator/ai-core');
              aiProvider = new ClaudeProvider(apiKey);
            }
            if (aiProvider) {
              log.info(chalk.blue(`AI provider: ${aiProvider.name} (fallback when heuristic < 85%)`));
            }
          } catch {
            log.info(chalk.yellow('AI SDK not available — running heuristic-only.'));
          }
        } else {
          log.info(chalk.gray('No AI key configured. Run: smartlocator configure set --provider <name> --key <key>'));
        }
      } else {
        log.info(chalk.gray('AI disabled (--no-ai).'));
      }

      const { index, stopWatching } = await initRepository(opts.root);
      const patchManager = new PatchManager();

      const wss = startAgent({
        aiProvider,
        repoIndex: index,
        patchManager,
        framework: index.framework,
      });

      wss.on('listening', () => {
        console.log(chalk.green(`\nAgent listening on ws://localhost:${WS_PORT}\n`));
        console.log(chalk.gray('Load the extension: chrome://extensions → Load unpacked → apps/extension/dist'));
        console.log(chalk.gray('Press ALT+C on any page to capture an element.'));
        console.log(chalk.gray('Logs: ~/.smartlocator/logs.log'));
        console.log(chalk.gray('\nCtrl+C to stop.\n'));
      });

      process.on('SIGINT', () => {
        console.log(chalk.gray('\nStopping agent...'));
        stopWatching();
        wss.close(() => process.exit(0));
      });
    });
}
