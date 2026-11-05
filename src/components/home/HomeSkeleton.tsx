export function HomeSkeleton() {
  return (
    <div role="status" aria-label="Загрузка главного экрана" className="space-y-4">
      <div className="h-16 animate-pulse rounded-card bg-usnee-surface motion-reduce:animate-none" />
      <div className="h-52 animate-pulse rounded-hero bg-usnee-surface motion-reduce:animate-none" />
      <p className="text-caption uppercase tracking-[.14em] text-usnee-text3">Чистится дневник…</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="h-16 animate-pulse rounded-card bg-usnee-surface motion-reduce:animate-none" />
        <div className="h-16 animate-pulse rounded-card bg-usnee-surface motion-reduce:animate-none" />
        <div className="h-16 animate-pulse rounded-card bg-usnee-surface motion-reduce:animate-none" />
      </div>
      <span className="sr-only">Загрузка…</span>
    </div>
  );
}
