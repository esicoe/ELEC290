import { useEffect, useRef, useState } from "preact/hooks";
import { getLink, getMessages, sendMessage, type Link, type Message } from "./api";
import { Sidebar } from "./components/Sidebar";
import { Messages } from "./pages/Messages";
import { Placeholder } from "./pages/Placeholder";

const POLL_MS = 1000;

const PLACEHOLDERS: Record<string, string> = {
  discover: "Discover",
  settings: "Settings",
  user: "User",
};

function currentPage() {
  const name = location.hash.slice(2);
  return Object.hasOwn(PLACEHOLDERS, name) ? name : "messages";
}

export function App() {
  const [page, setPage] = useState(currentPage);
  const [link, setLink] = useState<Link | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const latest = useRef(0);

  const refresh = async () => {
    const request = ++latest.current;
    let newLink: Link = { connected: false, rssiDbm: null };
    let newMessages: Message[] | null = null;
    try {
      newLink = await getLink();
      newMessages = await getMessages();
    } catch {
      newLink = { connected: false, rssiDbm: null };
    }
    // Ignore a slow response that a newer request has overtaken.
    if (request !== latest.current) return;
    setLink(newLink);
    if (newMessages) setMessages(newMessages);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const poll = async () => {
      await refresh();
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    };
    poll();
    const onHashChange = () => setPage(currentPage());
    addEventListener("hashchange", onHashChange);
    return () => {
      stopped = true;
      clearTimeout(timer);
      removeEventListener("hashchange", onHashChange);
    };
  }, []);

  const send = async (text: string) => {
    await sendMessage(text);
    void refresh();
  };

  return (
    <div class="h-dvh sm:p-2">
      <div class="flex h-full flex-col overflow-hidden sm:flex-row">
        <Sidebar link={link} page={page} />
        <main class="flex min-h-0 min-w-0 grow flex-col">
          {page === "messages" ? (
            <Messages messages={messages} connected={!!link?.connected} onSend={send} />
          ) : (
            <Placeholder title={PLACEHOLDERS[page]} />
          )}
        </main>
      </div>
    </div>
  );
}
