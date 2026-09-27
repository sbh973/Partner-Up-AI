import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Runs the real MuseProvider against a local mock of Meta's Responses API,
// using the response shape confirmed by the live smoke test.

let server: Server;
let lastBody: Record<string, unknown> = {};
let lastAuth = '';
let reply: () => { status: number; body: unknown } = () => ({ status: 500, body: {} });

const museMessage = (text: string) => ({
  object: 'response',
  status: 'completed',
  error: null,
  output: [
    { type: 'reasoning', summary: [] },
    { type: 'message', role: 'assistant', content: [{ type: 'output_text', text, annotations: [] }] },
  ],
});

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      lastBody = JSON.parse(raw || '{}') as Record<string, unknown>;
      lastAuth = String(req.headers.authorization ?? '');
      const { status, body } = reply();
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(typeof body === 'string' ? body : JSON.stringify(body));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  process.env.AI_PROVIDER = 'muse';
  process.env.MUSE_API_KEY = 'test-key-not-real';
  process.env.MUSE_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.MUSE_MODEL = 'meta/muse-spark-1.1';
  process.env.MUSE_TIMEOUT_MS = '1500';
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('MuseProvider', () => {
  it('sends a Responses-API request in JSON mode and canonicalises the result', async () => {
    const { parseGroupIntent, setAIProviderForTesting } = await import('../server/ai/service');
    const { MuseProvider } = await import('../server/ai/muse');
    setAIProviderForTesting(new MuseProvider());
    reply = () => ({
      status: 200,
      body: museMessage(
        JSON.stringify({
          summary: 'A programmer for a sustainability hackathon',
          category: 'hackathon teammate',
          lens: 'connect',
          needed_skills: ['coding'],
          interests: ['climate'],
          learning_needs: [],
          offers: [],
          location: null,
          context: 'hackathon',
          group_size: null,
          availability: [],
          languages: [],
          about_me: null,
        }),
      ),
    });
    const { value, source } = await parseGroupIntent('I need someone who codes for my climate hackathon');
    expect(source).toBe('muse');
    expect(value.intent.neededSkills).toEqual(['Programming']);
    expect(value.intent.interests).toEqual(['Sustainability']);
    expect(lastBody.model).toBe('muse-spark-1.1'); // "meta/" prefix stripped
    expect(lastBody.text).toEqual({ format: { type: 'json_object' } });
    expect(lastBody).not.toHaveProperty('response_format');
    expect(lastBody.store).toBe(false);
    expect(lastAuth).toBe('Bearer test-key-not-real');
  });

  it('falls back silently on HTTP errors, malformed JSON, and timeouts', async () => {
    const { extractProfile, generateGroupExplanation } = await import('../server/ai/service');

    reply = () => ({ status: 429, body: { error: { message: 'rate limited' } } });
    const a = await extractProfile('I love robotics and soccer');
    expect(a.source).toBe('offline');
    expect(a.value.interests).toEqual(expect.arrayContaining(['Robotics', 'Soccer']));

    reply = () => ({ status: 200, body: museMessage('not json at all') });
    const b = await generateGroupExplanation([{ name: 'Alex', isYou: false, skills: ['Programming'], interests: [], contributes: ['Programming'] }], ['Sustainability']);
    expect(b.source).toBe('offline');
    expect(b.value).toMatch(/Sustainability/);

    reply = () => ({ status: 200, body: museMessage('{"text": 42}') }); // schema mismatch
    const c = await generateGroupExplanation([], ['Hiking']);
    expect(c.source).toBe('offline');
  });
});
