'use client';

import { useState } from 'react';
import { SMSLog } from '@/types';

interface SMSThreadProps {
  messages: SMSLog[];
  clientId: string;
  clientPhone: string | null;
  onMessageSent?: () => void;
}

export function SMSThread({ messages, clientId, clientPhone, onMessageSent }: SMSThreadProps) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function sendMessage() {
    if (!body.trim() || !clientPhone) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, to: clientPhone, body: body.trim() }),
      });
      if (!res.ok) throw new Error('Send failed');
      setBody('');
      onMessageSent?.();
    } catch {
      setError('Failed to send message. Check Twilio config.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-[#4b5563] text-[13px] text-center mt-8">No messages yet.</p>
        )}
        {messages.map((msg) => {
          const isOutbound = msg.direction === 'outbound';
          const isScheduled = !!msg.scheduled_at && new Date(msg.scheduled_at) > new Date();

          return (
            <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                {msg.flagged && msg.direction === 'inbound' && (
                  <div className="mb-1 px-2 py-1 border border-red-700 bg-red-900/20 text-red-400 font-mono text-[10px] tracking-widest">
                    ⚠ FLAGGED — CASEWORKER NOTIFIED
                  </div>
                )}
                {msg.direction === 'inbound' && msg.body.toUpperCase().includes('RIDE') && !msg.flagged && (
                  <div className="mb-1 px-2 py-1 border border-amber-700 bg-amber-900/20 text-amber-400 font-mono text-[10px] tracking-widest">
                    TRANSPORT REQUEST — AUTO-RESPONDED
                  </div>
                )}
                <div
                  className={`relative px-3 py-2 text-[13px] ${
                    msg.flagged && msg.direction === 'inbound'
                      ? 'border border-red-700 bg-red-900/20 text-red-200'
                      : isOutbound
                      ? isScheduled
                        ? 'bg-[#1a2d1a] border border-[#2a3d2a] text-[#9ca3af] opacity-75'
                        : 'bg-[#14532d] text-white'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#e5e7eb]'
                  }`}
                >
                  {isScheduled && (
                    <div className="flex items-center gap-1 mb-1 font-mono text-[10px] text-[#6b7280]">
                      <span>🕐</span>
                      <span>
                        SCHEDULED — {new Date(msg.scheduled_at!).toLocaleString([], {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                  <p>{msg.body}</p>
                  <p className={`text-[10px] mt-1 ${isOutbound ? 'text-green-300/60' : 'text-[#4b5563]'}`}>
                    {new Date(msg.created_at).toLocaleString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compose area */}
      <div className="border-t border-[#1a1a1a] p-4 bg-[#0a0a0a]">
        {!clientPhone && (
          <p className="text-amber-400 font-mono text-[11px] mb-2">
            No phone number on file — cannot send SMS.
          </p>
        )}
        {error && <p className="text-red-400 font-mono text-[11px] mb-2">{error}</p>}
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message..."
            disabled={!clientPhone || sending}
            rows={2}
            className="flex-1 bg-[#111111] border border-[#1a1a1a] text-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#3b82f6] placeholder-[#4b5563] disabled:opacity-50 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!clientPhone || !body.trim() || sending}
            className="font-mono text-[11px] tracking-widest px-4 py-2 bg-[#14532d] text-white hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed h-full"
          >
            {sending ? 'SENDING...' : 'SEND'}
          </button>
        </div>
        <p className="font-mono text-[10px] text-[#4b5563] mt-1">{body.length}/160 chars</p>
      </div>
    </div>
  );
}
