import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Exercises the real Anthropic SDK code path against a local mock of the
// Messages API: verifies the request we send and how we parse the reply,
// plus the deterministic fallback when the model fails.

let server: Server;
let lastRequest: { headers: IncomingHttpHeaders; body: Record<string, unknown> } | null = null;
let reply: (body: Record<string, unknown>) => { status: number; json: unknown } = () => ({ status: 500, json: {} });

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = JSON.parse(raw || '{}') as Record<string, unknown>;
      lastRequest = { headers: req.headers, body };
      const { status, json } = reply(body);
      res.writeHead(status, { 'content-type': 'application/json', 'request-id': 'req_test' });
      res.end(JSON.stringify(json));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.ANTHROPIC_MODEL = 'claude-opus-5';
  process.env.AI_TIMEOUT_MS = '3000';
});

afterAll(() => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_BASE_URL;
  return new Promise<void>((r) => server.close(() => r()));
});

const message = (text: string) => ({
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  model: 'claude-opus-5',
  content: [{ type: 'text', text }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 10 },
});

describe('Partner AI via Claude', () => {
  it('sends a structured-output request and canonicalises the reply', async () => {
    const { parsePartnerIntent, setAIProviderForTesting } = await import('../server/ai/service');
    const { AnthropicProvider } = await import('../server/ai/anthropic');
    setAIProviderForTesting(new AnthropicProvider());
    reply = () => ({
      status: 200,
      json: message(
        JSON.stringify({
          mode: 'learn',
          summary: 'A chemistry study partner who needs calculus help',
          seeks: ['Chem'],
          offers: ['calc'],
          interests: [],
          availability: ['evenings'],
          groupPreference: 'pair',
          groupSizeMax: 1,
          setting: null,
          location: null,
          role: null,
          languagesSpoken: [],
          languagesLearning: [],
          followUps: [],
        }),
      ),
    });

    const intent = await parsePartnerIntent('good at calc, bad at chem, nights please', null);
    expect(intent.source).toBe('ai');
    expect(intent.mode).toBe('learn');
    expect(intent.seeks).toEqual(['chemistry']);
    expect(intent.offers).toEqual(['calculus']);

    const body = lastRequest?.body ?? {};
    expect(body.model).toBe('claude-opus-5');
    expect(body.fallbacks).toBe('default');
    expect(String(lastRequest?.headers['anthropic-beta'])).toContain('server-side-fallback-2026-07-01');
    const outputConfig = body.output_config as { effort?: string; format?: { type?: string } };
    expect(outputConfig.effort).toBe('low');
    expect(outputConfig.format?.type).toBe('json_schema');
    expect(String(lastRequest?.headers['x-api-key'])).toBe('test-key-not-real');
  });

  it('falls back to local understanding when the model errors', async () => {
    const { parsePartnerIntent } = await import('../server/ai/service');
    reply = () => ({ status: 529, json: { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } } });
    const intent = await parsePartnerIntent('I want someone to play Valorant with at night who also likes F1.', null);
    expect(intent.source).toBe('local');
    expect(intent.mode).toBe('connect');
    expect(intent.interests).toEqual(expect.arrayContaining(['valorant', 'formula-1']));
  });

  it('never lets a refusal break the flow', async () => {
    const { generateConnectionBridge } = await import('../server/ai/service');
    reply = () => ({ status: 200, json: { ...message(''), stop_reason: 'refusal', stop_details: { type: 'refusal', category: null, explanation: null } } });
    const bridge = await generateConnectionBridge(
      {
        candidateId: 'x',
        mode: 'connect',
        score: 90,
        dimensions: [],
        reasons: [],
        caveats: [],
        sharedInterests: [{ id: 'valorant', label: 'Valorant', emoji: '🎯' }],
        youOffer: [],
        theyOffer: [],
        mutualIntent: null,
        availabilityOverlap: [],
      },
      'Alex',
      'connect',
    );
    expect(bridge.source).toBe('local');
    expect(bridge.starters[0]).toMatch(/Valorant/);
  });
});
