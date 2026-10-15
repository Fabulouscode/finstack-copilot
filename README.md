# FinStack Copilot

AI agents can find what needs paying, check it, and write it up. They shouldn't be able to send the money.

FinStack Copilot is where a business approves what its agent proposes. The agent works through [FinStack](https://github.com/Fabulouscode/finstack)'s MCP server (`finstack mcp`): it can read wallets, transactions and payouts, and **propose** a payout with its reasoning and evidence. It can't pay. Every proposal lands here, and only a person can approve it, at which point FinStack pays it once, through PayPal or another provider.

## What it does

- **Inbox:** the agent's proposals, waiting for you, with the organization's balance.
- **Proposal:** what it wants to pay, to whom, why, and what it checked. Approve (with an explicit confirmation) or reject, with a note the agent can read.
- **Outcome:** the payout's status and the provider's reference once approved.
- **Ask the agent:** chat with Claude in plain English ("propose paying Ada $40 for her November illustrations"). It looks up balances, destinations and earlier proposals with FinStack's tools, then files a proposal with its reasoning and evidence, which appears in the inbox. You see each step it took.

FinStack enforces all of this, not the UI: the agent's API key can only hold `proposals:create`, approvals need a person with `proposals:decide`, and an approved proposal runs as an idempotent payout, so it can never pay twice.

## Run it

You need a running [FinStack](https://github.com/Fabulouscode/finstack) and Node 24.

```bash
npm install
cp .env.example .env.local   # set FINSTACK_API_URL and SESSION_SECRET (openssl rand -base64 32)
npm run dev                  # http://localhost:3000
```

Sign in with a FinStack account that belongs to an organization. Owners and admins can approve; other members can see proposals.

### Switching on the agent

The **Ask the agent** tab needs three settings in `.env.local`:

| Setting | What it is |
| --- | --- |
| `ANTHROPIC_API_KEY` | A Claude API key from [console.anthropic.com](https://console.anthropic.com) |
| `AGENT_API_KEY` | The agent's **own** FinStack API key, created in FinStack for the organization with scopes `proposals:create`, `wallets:read`, `transactions:read`, `organization:read`, and **not** `payouts:create` |
| `AGENT_ORGANIZATION_ID` | That organization's id |

The agent always acts with its own key, never with your session. So even if it were tricked (say, by an instruction hidden in an invoice it reads), the most it could do is propose a payout, which still waits for you. `ANTHROPIC_MODEL` picks the Claude model (default `claude-sonnet-5-5`).

## Built with

Next.js 16, React 19, Tailwind CSS 4, AG Grid (the proposals table), Claude through the Anthropic SDK (the agent, with tool use), and a typed client generated from FinStack's OpenAPI spec. The session code comes from [finstack-admin](https://github.com/Fabulouscode/finstack-admin): tokens live only in an encrypted, httpOnly cookie.

## License

MIT
