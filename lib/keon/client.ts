export interface KeonReceipts {
  directive: string | null;
  intent: string | null;
  request: string | null;
  decision: string | null;
  execution: string | null;
  outcome: string | null;
  evidence_pack: string | null;
}

export interface KeonGovernanceResult {
  governed: true;
  correlationId: string;
  tool: string;
  ok: boolean;
  decision: { status: string; policy_hash?: string } | null;
  result: Record<string, unknown>;
  receipts: KeonReceipts;
}

export interface KeonGovernanceError {
  governed: false;
  reason: string;
}

export type KeonResult = KeonGovernanceResult | KeonGovernanceError;

function isEnabled(): boolean {
  return (
    process.env.KEON_GOVERNANCE_ENABLED === 'true' &&
    !!process.env.KEON_MCP_GATEWAY_ENDPOINT
  );
}

function getEndpoint(): string {
  return (process.env.KEON_MCP_GATEWAY_ENDPOINT ?? '').replace(/\/$/, '');
}

interface KeonCallParams {
  purpose: string;
  action: string;
  resource: { type: string; id?: string; scope?: string };
  params: Record<string, unknown>;
  correlationId: string;
}

export async function callKeonGateway(args: KeonCallParams): Promise<KeonResult> {
  if (!isEnabled()) {
    return { governed: false, reason: 'governance_disabled' };
  }

  const endpoint = getEndpoint();
  const apiKey = process.env.KEON_MCP_API_KEY;
  const tenantId = process.env.KEON_MCP_TENANT_ID;
  const actorId = process.env.KEON_MCP_ACTOR_ID ?? 'silentapply-api';

  if (!apiKey || !tenantId) {
    return { governed: false, reason: 'missing_credentials' };
  }

  const body = {
    jsonrpc: '2.0',
    id: args.correlationId,
    method: 'tools/call',
    params: {
      name: 'keon.governed.execute.v1',
      arguments: {
        purpose: args.purpose,
        action: args.action,
        resource: args.resource,
        params: args.params,
        mode: 'decide_then_execute',
      },
    },
  };

  const response = await fetch(`${endpoint}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-06-18',
      'X-Api-Key': apiKey,
      'X-Keon-Tenant-Id': tenantId,
      'X-Keon-Actor-Id': actorId,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    return { governed: false, reason: `gateway_http_${response.status}` };
  }

  const json = await response.json();
  const structured = json?.result?.structuredContent;
  if (!structured) {
    return { governed: false, reason: 'no_structured_content' };
  }

  return {
    governed: true,
    correlationId: structured.correlation_id ?? args.correlationId,
    tool: structured.tool ?? 'keon.governed.execute.v1',
    ok: structured.ok === true,
    decision: structured.decision ?? null,
    result: (structured.result as Record<string, unknown>) ?? {},
    receipts: {
      directive: structured.receipts?.directive ?? null,
      intent: structured.receipts?.intent ?? null,
      request: structured.receipts?.request ?? null,
      decision: structured.receipts?.decision ?? null,
      execution: structured.receipts?.execution ?? null,
      outcome: structured.receipts?.outcome ?? null,
      evidence_pack: structured.receipts?.evidence_pack ?? null,
    },
  };
}
