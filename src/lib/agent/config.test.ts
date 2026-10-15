import { describe, expect, it } from 'vitest';
import { agentConfig } from './config';

describe('agentConfig', () => {
  it('stays off until every setting is present', () => {
    expect(agentConfig({ ANTHROPIC_API_KEY: 'sk-ant-x' } as unknown as NodeJS.ProcessEnv)).toEqual({
      configured: false,
      missing: ['AGENT_API_KEY', 'AGENT_ORGANIZATION_ID'],
    });
  });

  it('defaults the model', () => {
    const settings = agentConfig({ ANTHROPIC_API_KEY: 'a', AGENT_API_KEY: 'b', AGENT_ORGANIZATION_ID: 'c' } as unknown as NodeJS.ProcessEnv);
    expect(settings).toMatchObject({ configured: true, model: 'claude-sonnet-5-5' });
  });
});
