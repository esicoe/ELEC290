import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { Message } from "../api";
import { CheckIcon } from "../icons";

function ago(sentAt: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - sentAt) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function MessageList({ messages }: { messages: Message[] }) {
  const [now, setNow] = useState(Date.now);
  const list = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    if (atBottom.current) list.current!.scrollTop = list.current!.scrollHeight;
  }, [messages.length]);

  const onScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = list.current!;
    atBottom.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  return (
    <div
      ref={list}
      onScroll={onScroll}
      role="log"
      aria-label="Messages"
      aria-relevant="additions"
      tabIndex={0}
      class="min-h-0 grow overflow-y-auto px-5 mb-2 outline-none"
    >
      <ol>
        {messages.map((message) => (
          <li key={message.id} class="flex gap-4 py-3">
            <div class="min-w-0 grow">
              <h2>{message.from}</h2>
              <p class="text-sm break-words text-muted">{message.text}</p>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1">
              <span className="text-sm text-muted">{ago(message.sentAt, now)}</span>
              <span class="flex gap-2">
                {message.sent && <CheckIcon label="Sent" color="text-sent" />}
                {message.delivered && <CheckIcon label="Delivered" color="text-delivered" />}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
