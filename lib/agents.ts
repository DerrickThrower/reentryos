import { supabaseServer } from './supabase-server';

type AgentStatus = 'working' | 'done' | 'error';

export class AgentEmitter {
  private controller: ReadableStreamDefaultController;
  private encoder: TextEncoder;
  private clientId: string | null = null;
  private agentStartTimes = new Map<string, number>();
  private pendingLogs: Promise<unknown>[] = [];

  constructor(controller: ReadableStreamDefaultController, encoder: TextEncoder) {
    this.controller = controller;
    this.encoder = encoder;
  }

  setClientId(id: string) {
    this.clientId = id;
  }

  async emit(
    agent: string,
    status: AgentStatus,
    message: string,
    extraData?: Record<string, unknown>
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    if (status === 'working') {
      this.agentStartTimes.set(agent, Date.now());
    }

    let duration_ms: number | null = null;
    if (status === 'done' || status === 'error') {
      const start = this.agentStartTimes.get(agent);
      if (start) duration_ms = Date.now() - start;
    }

    const event: Record<string, unknown> = { agent, status, message, timestamp };
    if (extraData) Object.assign(event, extraData);

    try {
      this.controller.enqueue(
        this.encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
      );
    } catch {
      // Stream may already be closed
    }

    if (this.clientId) {
      // Fire-and-forget: don't block the pipeline on a DB round-trip per event.
      // Writes are tracked so flush() can await them before the stream closes.
      const write = Promise.resolve(
        supabaseServer.from('agent_logs').insert({
          client_id: this.clientId,
          agent_name: agent,
          status,
          message,
          duration_ms,
        })
      ).catch(() => {
        // Never let logging break the pipeline
      });
      this.pendingLogs.push(write);
    }
  }

  /** Await all in-flight log writes so none are dropped when the stream ends. */
  async flush(): Promise<void> {
    const pending = this.pendingLogs;
    this.pendingLogs = [];
    await Promise.allSettled(pending);
  }

  close(): void {
    try {
      this.controller.close();
    } catch {
      // Already closed
    }
  }
}
