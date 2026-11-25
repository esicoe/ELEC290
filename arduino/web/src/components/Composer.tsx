import { useEffect, useRef, useState } from "preact/hooks";
import { MAX_MESSAGE_LENGTH } from "../api";
import { SendIcon } from "../icons";

interface Props {
  disabled: boolean;
  onSend: (text: string) => Promise<void>;
}

export function Composer({ disabled, onSend }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut =
        (event.ctrlKey || event.altKey || event.metaKey) && !event.getModifierState("AltGraph");
      const typesCharacter = event.key.length === 1 && event.key !== " ";
      const inField = (event.target as Element).closest("input, textarea, select");
      if (typesCharacter && !shortcut && !inField) input.current!.focus();
    };
    addEventListener("keydown", onKeyDown);
    return () => removeEventListener("keydown", onKeyDown);
  }, []);

  const submit = async (event: Event) => {
    event.preventDefault();
    const message = text.trim();
    if (!message || disabled || sending) return;
    setSending(true);
    setFailed(false);
    try {
      await onSend(message);
      setText("");
    } catch {
      setFailed(true);
    }
    setSending(false);
  };

  return (
    <form onSubmit={submit} class="border-t border-line p-3">
      {failed && (
        <p role="alert" class="pb-2 text-sm">
          Message not sent. Try again.
        </p>
      )}
      <div class="flex gap-3">
        <input
          ref={input}
          class="min-w-0 grow rounded-lg border border-line px-3 py-1 placeholder:text-muted disabled:opacity-50"
          aria-label="Message"
          placeholder="Type a message and press send."
          autocomplete="off"
          maxLength={MAX_MESSAGE_LENGTH}
          value={text}
          disabled={disabled}
          readOnly={sending}
          onInput={(event) => setText(event.currentTarget.value)}
        />
        <button
          class="rounded-lg border border-line px-2 py-1 hover:bg-white/5 disabled:opacity-50"
          aria-label="Send"
          disabled={disabled}
        >
          <SendIcon />
        </button>
      </div>
    </form>
  );
}
