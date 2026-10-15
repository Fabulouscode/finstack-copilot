import type Anthropic from '@anthropic-ai/sdk';

/**
 * What the agent can do in FinStack, with the agent's own API key: read, and
 * propose a payout. The same tools `finstack mcp` serves. There is no tool
 * that pays or approves, and the key couldn't do either anyway.
 */
export interface FinStackAgentApi {
  get(path: string, query?: Record<string, string | number | undefined>): Promise<unknown>;
  post(path: string, body: object): Promise<unknown>;
}

type Input = Record<string, unknown>;

interface ToolSpec {
  tool: Anthropic.Tool;
  run(api: FinStackAgentApi, org: (path: string) => string, input: Input): Promise<unknown>;
  /** Writes something (a proposal). Everything else only reads. */
  writes?: boolean;
}

const uuid = { type: 'string', format: 'uuid' } as const;
const page = {
  limit: { type: 'integer', minimum: 1, maximum: 100 },
  cursor: { type: 'string', description: 'nextCursor from the previous page' },
} as const;

const SPECS: ToolSpec[] = [
  {
    tool: {
      name: 'finstack_list_wallets',
      description: "The organization's wallets, with available, pending and reserved balances in minor units.",
      input_schema: { type: 'object', properties: {} },
    },
    run: (api, org) => api.get(org('/wallets')),
  },
  {
    tool: {
      name: 'finstack_list_wallet_entries',
      description: "A wallet's ledger entries, newest first: every credit and debit with its transaction.",
      input_schema: { type: 'object', properties: { walletId: uuid, ...page }, required: ['walletId'] },
    },
    run: (api, org, { walletId, limit, cursor }) =>
      api.get(org(`/wallets/${String(walletId)}/entries`), { limit: limit as number, cursor: cursor as string }),
  },
  {
    tool: {
      name: 'finstack_list_transactions',
      description: 'Payments, payouts, transfers and refunds, newest first, with type, status, amount and reference.',
      input_schema: { type: 'object', properties: { ...page } },
    },
    run: (api, org, { limit, cursor }) =>
      api.get(org('/transactions'), { limit: limit as number, cursor: cursor as string }),
  },
  {
    tool: {
      name: 'finstack_get_payout',
      description: 'A payout (money out) by id: destination, provider reference, status and failure reason.',
      input_schema: { type: 'object', properties: { payoutId: uuid }, required: ['payoutId'] },
    },
    run: (api, org, { payoutId }) => api.get(org(`/payouts/${String(payoutId)}`)),
  },
  {
    tool: {
      name: 'finstack_list_payout_destinations',
      description:
        'Saved accounts the organization can pay: bank accounts (last 4 digits) and PayPal accounts (masked email). Payouts can only go to these.',
      input_schema: { type: 'object', properties: {} },
    },
    run: (api, org) => api.get(org('/payout-destinations')),
  },
  {
    tool: {
      name: 'finstack_quote_payout_fee',
      description: 'What FinStack would charge for a payout of this amount, and the total taken from the wallet.',
      input_schema: {
        type: 'object',
        properties: {
          currency: { type: 'string', minLength: 3, maxLength: 3 },
          amount: { type: 'integer', minimum: 1, description: 'Minor units' },
        },
        required: ['currency', 'amount'],
      },
    },
    run: (api, org, { currency, amount }) =>
      api.get(org('/fees/quote'), { operation: 'payout', currency: currency as string, amount: amount as number }),
  },
  {
    tool: {
      name: 'finstack_list_proposals',
      description:
        'Proposals made so far, newest first, with status (pending, executed, failed, rejected, expired) and any decision note. Check before proposing, to avoid duplicates.',
      input_schema: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['pending', 'executed', 'failed', 'rejected', 'expired'] } },
      },
    },
    run: (api, org, { status }) => api.get(org('/proposals'), { status: status as string | undefined }),
  },
  {
    writes: true,
    tool: {
      name: 'finstack_propose_payout',
      description:
        'Proposes paying a saved destination. This does NOT pay: it creates a proposal a person reviews and approves. Include a clear summary, your reasoning and the evidence you checked.',
      input_schema: {
        type: 'object',
        properties: {
          destinationId: uuid,
          amount: { type: 'integer', minimum: 1, description: 'Minor units, e.g. 2500 for $25.00' },
          summary: { type: 'string', minLength: 5, maxLength: 300, description: 'One line the approver reads first' },
          reasoning: { type: 'string', minLength: 5, maxLength: 4000 },
          evidence: { type: 'object', description: 'What you checked: record ids, figures, dates' },
          narration: { type: 'string', maxLength: 100, description: "Shown on the recipient's side" },
        },
        required: ['destinationId', 'amount', 'summary', 'reasoning'],
      },
    },
    run: (api, org, input) => api.post(org('/proposals'), { kind: 'payout', ...input }),
  },
];

export const AGENT_TOOLS: Anthropic.Tool[] = SPECS.map((spec) => spec.tool);
export const WRITE_TOOLS = new Set(SPECS.filter((spec) => spec.writes).map((spec) => spec.tool.name));

export function runTool(
  api: FinStackAgentApi,
  organizationId: string,
  name: string,
  input: Input,
): Promise<unknown> {
  const spec = SPECS.find((candidate) => candidate.tool.name === name);
  if (!spec) return Promise.reject(new Error(`Unknown tool ${name}`));
  return spec.run(api, (path) => `/v1/organizations/${encodeURIComponent(organizationId)}${path}`, input);
}
