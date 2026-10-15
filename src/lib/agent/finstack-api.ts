import type { FinStackAgentApi } from './tools';

/** FinStack's REST API with the agent's API key. Refusals become errors the agent reads. */
export function finstackAgentApi(baseUrl: string, apiKey: string, fetchFn: typeof fetch = fetch): FinStackAgentApi {
  const request = async (method: 'GET' | 'POST', path: string, body?: object): Promise<unknown> => {
    const response = await fetchFn(`${baseUrl}${path}`, {
      method,
      headers: { 'X-API-Key': apiKey, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    const parsed: unknown = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const problem = (parsed ?? {}) as { code?: string; detail?: string };
      throw new Error(`FinStack answered ${response.status}${problem.code ? ` ${problem.code}` : ''}: ${problem.detail ?? 'request refused'}`);
    }
    return parsed;
  };
  return {
    get: (path, query = {}) => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value));
      return request('GET', params.size ? `${path}?${params.toString()}` : path);
    },
    post: (path, body) => request('POST', path, body),
  };
}
