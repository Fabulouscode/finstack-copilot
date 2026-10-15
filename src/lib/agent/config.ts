export type AgentConfig =
  | { configured: true; anthropicApiKey: string; model: string; apiKey: string; organizationId: string }
  | { configured: false; missing: string[] };

/**
 * The agent acts with its own FinStack API key (proposals:create and read
 * scopes only), never with the signed-in person's session, so it can propose
 * payouts but has no way to approve or send them.
 */
export function agentConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const values = {
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
    AGENT_API_KEY: env.AGENT_API_KEY,
    AGENT_ORGANIZATION_ID: env.AGENT_ORGANIZATION_ID,
  };
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) return { configured: false, missing };
  return {
    configured: true,
    anthropicApiKey: values.ANTHROPIC_API_KEY!,
    model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    apiKey: values.AGENT_API_KEY!,
    organizationId: values.AGENT_ORGANIZATION_ID!,
  };
}
