import { listConversations } from './chat.repository';

export async function readConversations() {
  return listConversations();
}
