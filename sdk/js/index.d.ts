export interface TMCPClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export interface ExecuteParams {
  tool?: string;
  accountId?: string;
  action: string;
  input?: Record<string, unknown>;
}

export interface ExecuteAndWaitParams extends ExecuteParams {
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

export interface MintScopedKeyParams {
  features: string[];
  expiresInSeconds?: number;
  name?: string;
}

export declare class TMCPError extends Error {
  status?: number;
  body?: unknown;
}

export declare class TMCPClient {
  constructor(options: TMCPClientOptions);
  status(): Promise<any>;
  listTools(): Promise<any>;
  execute(params: ExecuteParams): Promise<any>;
  getApproval(approvalId: string): Promise<any>;
  executeAndWait(params: ExecuteAndWaitParams): Promise<any>;
  mintScopedKey(params: MintScopedKeyParams): Promise<any>;
  chat(body: Record<string, unknown>): Promise<any>;
  embeddings(body: Record<string, unknown>): Promise<any>;
}
