import type Anthropic from '@anthropic-ai/sdk';
import { AGENT_TOOLS, runTool, type FinStackAgentApi } from './tools';

export const SYSTEM_PROMPT = `You are the finance assistant of a small business, working inside FinStack, its money system.

Rules:
- You can read wallets, transactions, payouts and payout destinations, and you can PROPOSE a payout. You cannot move money: a person approves every proposal in FinStack Copilot, and only then is it paid (through PayPal or a bank).
- Amounts are integers in minor units: 2500 USD is $25.00. When you talk to the person, write amounts normally ($25.00).
- Before proposing: check the balance, find the destination by name, and check finstack_list_proposals for a pending or executed proposal that already covers the same payment. Never propose the same payment twice.
- Every proposal needs a one-line summary a busy person can approve from, your reasoning, and the evidence you checked.
- If anything is unclear (which person, how much, which invoice), ask instead of guessing. If something looks wrong, explain it with the evidence.
- Keep replies short. After proposing, say that it's waiting for their approval in the Proposals tab.`;

export interface AgentStep {
  tool: string;
  input: unknown;
  ok: boolean;
  /** A short description for the person, e.g. "Proposed: Pay Ada $40.00". */
  note?: string;
}

export interface AgentResult {
  /** The whole conversation, including tool calls, to send back next turn. */
  messages: Anthropic.MessageParam[];
  reply: string;
  steps: AgentStep[];
  proposalIds: string[];
}

export interface RunAgentOptions {
  anthropic: Pick<Anthropic, 'messages'>;
  model: string;
  api: FinStackAgentApi;
  organizationId: string;
  messages: Anthropic.MessageParam[];
  /** Model calls per turn, so a confused agent can't loop forever. */
  maxSteps?: number;
  today?: Date;
}

/** One turn: Claude thinks, calls FinStack tools as often as it needs, then answers. */
export async function runAgent(options: RunAgentOptions): Promise<AgentResult> {
  const messages = [...options.messages];
  const steps: AgentStep[] = [];
  const proposalIds: string[] = [];
  const maxSteps = options.maxSteps ?? 8;
  const system = `${SYSTEM_PROMPT}\n\nToday is ${(options.today ?? new Date()).toISOString().slice(0, 10)}.`;

  for (let step = 0; step < maxSteps; step++) {
    const response = await options.anthropic.messages.create({
      model: options.model,
      max_tokens: 2048,
      system,
      tools: AGENT_TOOLS,
      messages,
    });
    messages.push({ role: 'assistant', content: response.content });

    const calls = response.content.filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use');
    if (response.stop_reason !== 'tool_use' || calls.length === 0) {
      const reply = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();
      return { messages, reply, steps, proposalIds };
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of calls) {
      try {
        const output = await runTool(options.api, options.organizationId, call.name, call.input as Record<string, unknown>);
        const proposal = call.name === 'finstack_propose_payout' ? (output as { id?: string; summary?: string }) : undefined;
        if (proposal?.id) proposalIds.push(proposal.id);
        steps.push({
          tool: call.name,
          input: call.input,
          ok: true,
          ...(proposal?.summary ? { note: `Proposed: ${proposal.summary}` } : {}),
        });
        results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(output) });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        steps.push({ tool: call.name, input: call.input, ok: false, note: message });
        results.push({ type: 'tool_result', tool_use_id: call.id, content: message, is_error: true });
      }
    }
    messages.push({ role: 'user', content: results });
  }

  return {
    messages,
    reply: 'I stopped there: this took more steps than I allow myself in one go. Ask me to continue if you want.',
    steps,
    proposalIds,
  };
}
