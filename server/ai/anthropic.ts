import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { config } from '../config';
import { AIUnavailableError, type AIProvider, type StructuredRequest } from './provider';

/** Models that support server-side refusal fallbacks (`fallbacks: "default"`). */
function supportsServerFallbacks(model: string): boolean {
  return model.startsWith('claude-opus-5') || model.startsWith('claude-fable-5');
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor() {
    // Credentials resolve from the server environment (ANTHROPIC_API_KEY etc.).
    // No retries: a slow model should fall back to local understanding, not stall the UI.
    this.client = new Anthropic({ timeout: config.aiTimeoutMs, maxRetries: 0 });
  }

  async structured<T>({ system, user, schema }: StructuredRequest<T>): Promise<T> {
    const model = config.anthropicModel;
    try {
      const response = await this.client.beta.messages.parse({
        model,
        max_tokens: 8000,
        system,
        messages: [{ role: 'user', content: user }],
        // Short extraction/writing tasks: low effort keeps latency demo-friendly.
        output_config: { effort: 'low', format: betaZodOutputFormat(schema) },
        ...(supportsServerFallbacks(model)
          ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
          : {}),
      });
      if (response.stop_reason === 'refusal') throw new AIUnavailableError('Model declined the request');
      if (response.stop_reason === 'max_tokens') throw new AIUnavailableError('Model output was truncated');
      if (!response.parsed_output) throw new AIUnavailableError('Model returned no structured output');
      return response.parsed_output;
    } catch (error) {
      if (error instanceof AIUnavailableError) throw error;
      if (error instanceof Anthropic.RateLimitError) throw new AIUnavailableError('Rate limited');
      if (error instanceof Anthropic.AuthenticationError) throw new AIUnavailableError('AI credentials rejected');
      if (error instanceof Anthropic.BadRequestError) throw new AIUnavailableError(`Bad request: ${error.message}`);
      if (error instanceof Anthropic.APIConnectionTimeoutError) throw new AIUnavailableError('Timed out');
      if (error instanceof Anthropic.APIConnectionError) throw new AIUnavailableError('Could not reach AI provider');
      if (error instanceof Anthropic.APIError) throw new AIUnavailableError(`AI provider error ${error.status ?? ''}`.trim());
      throw new AIUnavailableError(error instanceof Error ? error.message : 'Unknown AI error');
    }
  }
}
