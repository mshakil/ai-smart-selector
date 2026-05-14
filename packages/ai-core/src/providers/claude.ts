import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIProviderResult } from './interface';
import type { ElementCapturePayload } from '@smartlocator/shared';
import { buildElementSnippet, SYSTEM_PROMPT } from '../prompt';
import { parseAIResponse } from '../parse';

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateSelector(payload: ElementCapturePayload, signal?: AbortSignal): Promise<AIProviderResult> {
    const userContent = `${buildElementSnippet(payload)}\n\nPage URL: ${payload.url}`;

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }, { signal });

    const block = message.content.find(b => b.type === 'text');
    const text = block?.type === 'text' ? block.text : '{}';
    return parseAIResponse(text);
  }
}
