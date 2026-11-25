import type { ComponentChildren } from "preact";

const icon = (children: ComponentChildren) => (
  <svg
    class="size-6 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const TelescopeIcon = () =>
  icon(
    <>
      <path d="m3 10 12-6 3 6.5-12 4.5z" />
      <path d="m15 4 3-1.500 3.500 7-3.500 1" />
      <path d="m3 10-1.500.7 1.500 4 3-1" />
      <path d="m11 13.500-4 8M12 13.500l4 8" />
    </>,
  );

export const MessageIcon = () =>
  icon(<path d="M4 4h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7l-4 3V5a1 1 0 0 1 1-1z" />);

export const GearIcon = () =>
  icon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M10 2.500h4l.6 2.700 1.700 1 2.600-.9 2 3.400-2 1.900v2l2 1.900-2 3.400-2.600-.9-1.700 1-.6 2.700h-4l-.6-2.700-1.700-1-2.600.9-2-3.400 2-1.900v-2l-2-1.900 2-3.400 2.600.9 1.700-1z" />
    </>,
  );

export const UserIcon = () =>
  icon(
    <>
      <circle cx="12" cy="12" r="9.500" />
      <circle cx="12" cy="10" r="3.500" />
      <path d="M6 19c1-3 3.500-4 6-4s5 1 6 4" />
    </>,
  );

export const SendIcon = () => icon(<path d="M21 3 3 10.500l7.500 3 3 7.500zM10.500 13.500 21 3" />);

export const CheckIcon = ({ label, color }: { label: string; color: string }) => (
  <svg
    class={`size-4 ${color}`}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    aria-label={label}
  >
    <path d="m2 9 4 4 8-9" />
  </svg>
);
