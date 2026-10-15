import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { runAgent } from './run-agent';
import { AGENT_TOOLS, WRITE_TOOLS, type FinStackAgentApi } from './tools';

const ORG = 'org-1';

type Reply = Pick<Anthropic.Message, 'content' | 'stop_reason'>;

/** A scripted Claude: each call returns the next reply, and records what it was asked. */
function fakeClaude(...replies: Reply[]) {
  const requests: Anthropic.MessageCreateParams[] = [];
  const anthropic = {
    messages: {
      create: async (params: Anthropic.MessageCreateParams) => {
        requests.push(structuredClone(params));
        const reply = replies.shift();
        if (!reply) throw new Error('No more scripted replies');
        return { id: 'msg', type: 'message', role: 'assistant', model: 'test', usage: {}, stop_sequence: null, ...reply };
      },
    },
  } as unknown as Pick<Anthropic, 'messages'>;
  return { anthropic, requests };
}

function fakeFinStack(responses: Record<string, unknown>) {
  const calls: { method: string; path: string; body?: unknown; query?: unknown }[] = [];
  const api: FinStackAgentApi = {
    get: async (path, query) => {
      calls.push({ method: 'GET', path, query });
      if (!(path in responses)) throw new Error(`FinStack answered 404: ${path}`);
      return responses[path];
    },
    post: async (path, body) => {
      calls.push({ method: 'POST', path, body });
      return responses[`POST ${path}`];
    },
  };
  return { api, calls };
}

const text = (value: string): Anthropic.TextBlock => ({ type: 'text', text: value, citations: null });
const use = (id: string, name: string, input: object): Anthropic.ToolUseBlock => ({ type: 'tool_use', id, name, input, caller: { type: 'direct' } });

describe('the agent', () => {
  it('can read and propose, and nothing else', () => {
    expect([...WRITE_TOOLS]).toEqual(['finstack_propose_payout']);
    expect(AGENT_TOOLS.map((tool) => tool.name).join(' ')).not.toMatch(/approve|send|pay_now|transfer/);
  });

  it('looks things up, proposes, and reports back', async () => {
    const { anthropic, requests } = fakeClaude(
      { stop_reason: 'tool_use', content: [text('Let me check.'), use('t1', 'finstack_list_payout_destinations', {})] },
      {
        stop_reason: 'tool_use',
        content: [use('t2', 'finstack_propose_payout', { destinationId: 'd1', amount: 4000, summary: 'Pay Ada $40.00', reasoning: 'INV-117 is unpaid.' })],
      },
      { stop_reason: 'end_turn', content: [text('Done: it’s waiting for your approval in Proposals.')] },
    );
    const { api, calls } = fakeFinStack({
      [`/v1/organizations/${ORG}/payout-destinations`]: [{ id: 'd1', accountName: 'Ada' }],
      [`POST /v1/organizations/${ORG}/proposals`]: { id: 'p1', status: 'pending', summary: 'Pay Ada $40.00' },
    });

    const result = await runAgent({
      anthropic,
      model: 'test-model',
      api,
      organizationId: ORG,
      messages: [{ role: 'user', content: 'Pay Ada for November' }],
      today: new Date('2026-11-14T10:00:00Z'),
    });

    expect(result.reply).toBe('Done: it’s waiting for your approval in Proposals.');
    expect(result.proposalIds).toEqual(['p1']);
    expect(result.steps.map((s) => [s.tool, s.ok, s.note])).toEqual([
      ['finstack_list_payout_destinations', true, undefined],
      ['finstack_propose_payout', true, 'Proposed: Pay Ada $40.00'],
    ]);
    expect(calls[1]).toMatchObject({ method: 'POST', body: { kind: 'payout', destinationId: 'd1', amount: 4000 } });
    expect(requests[0]?.model).toBe('test-model');
    expect(requests[0]?.system).toContain('Today is 2026-11-14');
    expect(requests[0]?.system).toContain('You cannot move money');
    // The tool's result goes back to Claude on the next call.
    expect(JSON.stringify(requests[1]?.messages.at(-1))).toContain('"tool_use_id":"t1"');
  });

  it("hands FinStack's refusal back to Claude as an error to explain", async () => {
    const { anthropic, requests } = fakeClaude(
      { stop_reason: 'tool_use', content: [use('t1', 'finstack_get_payout', { payoutId: 'missing' })] },
      { stop_reason: 'end_turn', content: [text('I couldn’t find that payout.')] },
    );
    const { api } = fakeFinStack({});

    const result = await runAgent({ anthropic, model: 'm', api, organizationId: ORG, messages: [{ role: 'user', content: 'Where is payout x?' }] });

    expect(result.steps[0]).toMatchObject({ ok: false });
    const last = requests[1]?.messages.at(-1)?.content as Anthropic.ToolResultBlockParam[];
    expect(last[0]).toMatchObject({ type: 'tool_result', is_error: true });
    expect(result.reply).toBe('I couldn’t find that payout.');
  });

  it('stops a runaway loop', async () => {
    const loop = { stop_reason: 'tool_use' as const, content: [use('t', 'finstack_list_wallets', {})] };
    const { anthropic, requests } = fakeClaude(loop, loop, loop);
    const { api } = fakeFinStack({ [`/v1/organizations/${ORG}/wallets`]: [] });

    const result = await runAgent({ anthropic, model: 'm', api, organizationId: ORG, messages: [{ role: 'user', content: 'Hi' }], maxSteps: 3 });

    expect(requests).toHaveLength(3);
    expect(result.reply).toMatch(/more steps than I allow/);
  });
});
