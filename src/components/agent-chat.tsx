'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content?: unknown; is_error?: boolean };
type Message = { role: 'user' | 'assistant'; content: string | Block[] };

const LABELS: Record<string, string> = {
  finstack_list_wallets: 'Checked the wallet balances',
  finstack_list_wallet_entries: 'Read the wallet history',
  finstack_list_transactions: 'Looked through recent transactions',
  finstack_get_payout: 'Looked up a payout',
  finstack_list_payout_destinations: 'Looked up who you can pay',
  finstack_quote_payout_fee: 'Checked the payout fee',
  finstack_list_proposals: 'Checked earlier proposals',
  finstack_propose_payout: 'Proposed a payout',
};

const SUGGESTIONS = [
  'How much do we have available?',
  'Who can we pay?',
  'Propose paying Ada $40 for her November illustrations.',
];

interface Item {
  kind: 'you' | 'agent' | 'step';
  text: string;
  error?: boolean;
  proposalId?: string;
}

/** Turns the raw conversation (with tool calls) into what a person reads. */
function toItems(messages: Message[]): Item[] {
  const items: Item[] = [];
  const results = new Map<string, { content?: unknown; is_error?: boolean }>();
  for (const message of messages) {
    if (typeof message.content !== 'string') {
      for (const block of message.content) if (block.type === 'tool_result') results.set(block.tool_use_id, block);
    }
  }
  for (const message of messages) {
    if (typeof message.content === 'string') {
      items.push({ kind: message.role === 'user' ? 'you' : 'agent', text: message.content });
      continue;
    }
    for (const block of message.content) {
      if (block.type === 'text' && block.text.trim()) items.push({ kind: message.role === 'user' ? 'you' : 'agent', text: block.text });
      if (block.type === 'tool_use') {
        const result = results.get(block.id);
        let proposalId: string | undefined;
        if (block.name === 'finstack_propose_payout' && !result?.is_error && typeof result?.content === 'string') {
          try {
            proposalId = (JSON.parse(result.content) as { id?: string }).id;
          } catch {}
        }
        items.push({
          kind: 'step',
          text: LABELS[block.name] ?? block.name,
          error: result?.is_error,
          proposalId,
        });
      }
    }
  }
  return items;
}

export function AgentChat({ organizationId, unavailable }: { organizationId: string; unavailable?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const bottom = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const next: Message[] = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/agent/${organizationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const body = (await response.json()) as { messages?: Message[]; error?: string };
      if (!response.ok || !body.messages) throw new Error(body.error ?? 'The agent didn’t answer. Try again.');
      setMessages(body.messages);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
      setMessages(messages);
      setDraft(question);
    } finally {
      setBusy(false);
      setTimeout(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  if (unavailable) {
    return <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">{unavailable}</p>;
  }

  const items = toItems(messages);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-64 flex-col gap-3 rounded-lg bg-white p-4 ring-1 ring-zinc-200">
        {items.length === 0 && (
          <div className="flex flex-col items-start gap-2 text-sm text-zinc-600">
            <p>Try:</p>
            {SUGGESTIONS.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => send(suggestion)} className="rounded-full px-3 py-1 text-left ring-1 ring-zinc-300 hover:bg-zinc-100">
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {items.map((item, index) =>
          item.kind === 'step' ? (
            <p key={index} className={`flex items-center gap-2 pl-1 text-xs ${item.error ? 'text-red-700' : 'text-zinc-500'}`}>
              <span aria-hidden>{item.error ? '✕' : '✓'}</span>
              {item.text}
              {item.error && ' (FinStack refused)'}
              {item.proposalId && (
                <Link href={`/o/${organizationId}/proposals/${item.proposalId}`} className="font-medium text-emerald-800 underline">
                  Review it
                </Link>
              )}
            </p>
          ) : (
            <div
              key={index}
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2 text-sm ${item.kind === 'you' ? 'self-end bg-zinc-900 text-white' : 'self-start bg-zinc-100 text-zinc-900'}`}
            >
              {item.text}
            </div>
          ),
        )}
        {busy && <p className="pl-1 text-xs text-zinc-500">Checking FinStack…</p>}
        <div ref={bottom} />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
        className="flex gap-2"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="e.g. Propose paying Ada $40 for her November illustrations"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !draft.trim()} className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
