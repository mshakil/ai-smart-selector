import OpenAI from 'openai';
import type { AIProvider, AIProviderResult } from './interface';
import type { ElementCapturePayload } from '@smartlocator/shared';
import { buildElementSnippet, SYSTEM_PROMPT } from '../prompt';
import { parseAIResponse } from '../parse';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateSelector(payload: ElementCapturePayload, signal?: AbortSignal): Promise<AIProviderResult> {
    const userContent = `${buildElementSnippet(payload)}\n\nPage URL: ${payload.url}`;

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 256,
    }, { signal });

    return parseAIResponse(completion.choices[0]?.message?.content ?? '{}');
  }
}
