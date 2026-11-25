import type { Link } from "../api";
import { GearIcon, MessageIcon, TelescopeIcon, UserIcon } from "../icons";

const ITEMS = [
  { page: "discover", label: "Discover", Icon: TelescopeIcon },
  { page: "messages", label: "Messages", Icon: MessageIcon },
  { page: "settings", label: "Settings", Icon: GearIcon },
  { page: "user", label: "User", Icon: UserIcon },
];

interface Props {
  link: Link | null;
  page: string;
}

export function Sidebar({ link, page }: Props) {
  const title = !link ? "Connecting" : link.connected ? "Connected" : "Disconnected";
  return (
    <aside class="contents sm:flex sm:w-56 sm:shrink-0 sm:flex-col sm:border-r sm:border-line">
      <header class="border-b border-line px-5 py-3 sm:border-0 sm:pt-6">
        <h1 class="text-2xl sm:text-3xl" aria-live="polite">{title}</h1>
        {link && (
          <p class="mt-1 text-xs text-muted">
            {link.connected ? "Connected to your device via IR." : "No IR link to your device."}
          </p>
        )}
        <div className="flex">
          {link?.connected && link.rssiDbm !== null && <div className="gap-x-1 flex flex-row">
            <p class="mt-1 text-xs text-muted border rounded-md p-1">Good</p>
            <p class="mt-1 text-xs text-muted border rounded-md p-1">{link.rssiDbm} dBm</p>
          </div>}
        </div>
      </header>
      <nav class="order-last flex justify-around border-t border-line p-2 sm:order-none sm:grow sm:flex-col sm:justify-start sm:gap-1 sm:border-0">
        {ITEMS.map(({ page: name, label, Icon }) => (
          <a
            key={name}
            href={`#/${name}`}
            aria-current={name === page ? "page" : undefined}
            class={`flex flex-col items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-white/5 sm:flex-row sm:gap-3 sm:py-2 sm:text-sm ${
              name === page ? "border-line text-white" : "border-transparent text-muted"
            } ${name === "settings" ? "sm:mt-auto" : ""}`}
          >
            <Icon />
            {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
