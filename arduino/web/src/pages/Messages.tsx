import type { Message } from "../api";
import { Composer } from "../components/Composer";
import { MessageList } from "../components/MessageList";

interface Props {
  messages: Message[];
  connected: boolean;
  onSend: (text: string) => Promise<void>;
}

export function Messages({ messages, connected, onSend }: Props) {
  return (
    <>
      <MessageList messages={messages} />
      <Composer disabled={!connected} onSend={onSend} />
    </>
  );
}
