export function PageHeader({ eyebrow, title, description, actions, testid = "page-title" }) {
  return (
    <div className="mb-10 flex flex-col gap-6 animate-rise lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="font-label text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{eyebrow}</p>
        )}
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl" data-testid={testid}>
          {title}
        </h1>
        {description && <p className="mt-4 text-base leading-relaxed text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action, testid }) {
  return (
    <div data-testid={testid} className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center sm:px-12">
      {Icon && (
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-700" aria-hidden="true">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h2 className="mt-4 font-display text-xl font-semibold text-slate-900">{title}</h2>
      {children && <p className="mx-auto mt-2 max-w-md text-slate-600">{children}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, id, aside }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 id={id} className="font-display text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{children}</h2>
      {aside}
    </div>
  );
}
