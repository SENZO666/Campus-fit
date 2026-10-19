import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { SkipLink } from "@/components/SkipLink";

const AUTH_IMAGE = "https://images.pexels.com/photos/5537996/pexels-photo-5537996.jpeg?auto=compress&cs=tinysrgb&w=1200";

export const homeFor = (u) => (u.role === "admin" ? "/admin" : u.onboarded ? "/dashboard" : "/onboarding");

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <SkipLink />
      <main id="main-content" tabIndex={-1} className="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16">
        <Link to="/" aria-label="CampusFit Planner home" className="self-start" data-testid="auth-logo-link">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12 animate-rise">
          <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{title}</h1>
          <p className="mt-3 text-base text-slate-600">{subtitle}</p>
          <div className="mt-10">{children}</div>
          <div className="mt-8 text-sm text-slate-700">{footer}</div>
        </div>
      </main>
      <aside className="on-dark relative hidden overflow-hidden bg-obsidian lg:block" aria-hidden="true">
        <img src={AUTH_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-obsidian/40" />
        <div className="absolute inset-x-12 bottom-12 rounded-2xl border border-white/15 bg-obsidian/80 p-8 text-white backdrop-blur-xl">
          <p className="font-label text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Built around your week</p>
          <p className="mt-3 font-display text-2xl font-semibold leading-snug">
            "Twenty minutes between lectures is still twenty minutes. That counts."
          </p>
        </div>
      </aside>
    </div>
  );
}
