export function Placeholder({ title }: { title: string }) {
  return (
    <section class="p-5">
      <h2 class="text-2xl">{title}</h2>
      <p class="mt-2 text-sm text-muted">Nothing here yet.</p>
    </section>
  );
}
