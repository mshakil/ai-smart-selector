import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Skip in monorepo / CI dev installs — only show for real consumer installs.
const __dirname = dirname(fileURLToPath(import.meta.url));
const isMonorepo = existsSync(resolve(__dirname, '../../../pnpm-workspace.yaml'));
if (isMonorepo) process.exit(0);

console.log(`
  ✓ SmartLocator AI installed

  1. Start the agent (run inside your test repo):
       smartlocator start

  2. Load the Chrome extension:
       smartlocator install-extension

  3. Configure AI provider (optional):
       smartlocator configure set --provider openai --key sk-...
       smartlocator configure set --provider claude  --key sk-ant-...
`);
