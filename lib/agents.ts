import { supabaseServer } from './supabase-server';

type AgentStatus = 'working' | 'done' | 'error';

export class AgentEmitter {
  private controller: ReadableStreamDefaultController;
  private encoder: TextEncoder;
  private clientId: string | null = null;
  private agentStartTimes = new Map<string, number>();

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
      try {
        await supabaseServer.from('agent_logs').insert({
          client_id: this.clientId,
          agent_name: agent,
          status,
          message,
          duration_ms,
        });
      } catch {
        // Never let logging break the pipeline
      }
    }
  }

  close(): void {
    try {
      this.controller.close();
    } catch {
      // Already closed
    }
  }
}
