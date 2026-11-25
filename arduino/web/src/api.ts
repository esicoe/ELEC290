export interface Message {
  id: number;
  from: string;
  text: string;
  sentAt: number; // Date.now() time
  sent: boolean; // transmitted over IR
  delivered: boolean; // acknowledged by the other module
}

export interface Link {
  connected: boolean;
  rssiDbm: number | null;
}

export const MAX_MESSAGE_LENGTH = 120;

const ME = "User1";
const SENT_AFTER_MS = 800;
const DELIVERED_AFTER_MS = 2000;

const seed = (id: number, from: string, text: string, secondsAgo: number) => ({
  id,
  from,
  text,
  sentAt: Date.now() - secondsAgo * 1000,
});

const messages = [
  seed(1, "User1", "Hello world!", 10),
  seed(2, "User2", "Hello there!", 8),
  seed(3, "User1", "How's the prototyping?", 5),
  seed(4, "User2", "Pretty good!", 1),
];

export async function getLink(): Promise<Link> {
  // Open the dev server with ?offline to see the disconnected state.
  if (import.meta.env.DEV && location.search === "?offline") {
    return { connected: false, rssiDbm: null };
  }
  return { connected: true, rssiDbm: -60 };
}

export async function getMessages(): Promise<Message[]> {
  const now = Date.now();
  return messages.map((message) => ({
    ...message,
    sent: message.id <= 4 || now - message.sentAt >= SENT_AFTER_MS,
    delivered: message.id <= 4 || now - message.sentAt >= DELIVERED_AFTER_MS,
  }));
}

export async function sendMessage(text: string): Promise<void> {
  messages.push(seed(messages.length + 1, ME, text, 0));
}
