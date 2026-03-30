import type { RowDataPacket } from 'mysql2/promise';

import type { ConversationPreview } from '@shared/contracts/chat';

import { pool } from '@/lib/mysql';

interface ConversationRow extends RowDataPacket {
  id: string;
  name: string;
  time: string;
  topic: string;
  last_message: string;
}

const fallbackConversations: ConversationPreview[] = [
  {
    id: 'chat-1',
    name: 'Mina',
    time: '09:20',
    topic: 'Chaoyang one bedroom',
    lastMessage: 'I can do a video walkthrough tonight if you want to confirm the room.'
  },
  {
    id: 'chat-2',
    name: 'Kevin',
    time: 'Yesterday',
    topic: 'Roommate matching',
    lastMessage: 'My budget is similar, and I am mostly looking around line 2 and line 10.'
  }
];

export async function listConversations(): Promise<ConversationPreview[]> {
  try {
    const [rows] = await pool.execute<ConversationRow[]>(
      'SELECT id, name, time, topic, last_message FROM conversations LIMIT 20'
    );

    if (rows.length === 0) return fallbackConversations;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      time: row.time,
      topic: row.topic,
      lastMessage: row.last_message
    }));
  } catch {
    return fallbackConversations;
  }
}
