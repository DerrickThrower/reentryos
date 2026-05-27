'use client';

import { SMSLog } from '@/types';
import { SMSThread } from '@/components/SMSThread';

interface MessagesTabProps {
  messages: SMSLog[];
  clientId: string;
  clientPhone: string | null;
  onRefresh: () => void;
}

export function MessagesTab({
  messages,
  clientId,
  clientPhone,
  onRefresh,
}: MessagesTabProps) {
  return (
    <div className="h-[calc(100vh-210px)] border border-[#1a1a1a] bg-[#111111]">
      <SMSThread
        messages={messages}
        clientId={clientId}
        clientPhone={clientPhone}
        onMessageSent={onRefresh}
      />
    </div>
  );
}
