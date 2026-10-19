import { Link } from "react-router-dom";
import {
  ArrowRight, BarChart3, CalendarClock, CalendarRange, EyeOff, Play, ShieldCheck, SlidersHorizontal, Timer, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { SkipLink } from "@/components/SkipLink";
import { useAuth } from "@/context/AuthContext";
import { homeFor } from "@/components/AuthLayout";

const HERO = "https://images.pexels.com/photos/8846350/pexels-photo-8846350.jpeg?auto=compress&cs=tinysrgb&w=1200";
const GUIDED = "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=900&q=70";
const PEERS = "https://images.pexels.com/photos/5537996/pexels-photo-5537996.jpeg?auto=compress&cs=tinysrgb&w=900";

const STEPS = [
  { icon: CalendarRange, title: "Tell us your week", text: "Pick the days and times you're free between lectures, how long you have, and what equipment you can use." },
  { icon: SlidersHorizontal, title: "Adjust your plan", text: "We suggest short sessions that fit. Swap an exercise, make a session shorter, or move it to another day." },
  { icon: Play, title: "Press Start", text: "Follow one exercise at a time with a rest timer. Mark it complete and see your week fill up." },
];

function Hero({ home }) {
  return (
    <section className="on-dark grain relative overflow-hidden bg-obsidian pb-24 pt-32 text-white lg:pb-32 lg:pt-40">
      <div className="grid-lines absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="stagger lg:col-span-6">
          <p className="font-label text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">For students with full timetables</p>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
            Training that fits <span className="text-emerald-400">between lectures.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            CampusFit Planner turns the time you actually have into a realistic weekly routine, then guides you through
            every session. No pressure, no guilt. Just the next doable step.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="xl" variant="accent">
              <Link to={home || "/register"} data-testid="hero-primary-cta">
                {home ? "Go to my dashboard" : "Create my plan"}<ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            {!home && (
              <Button asChild size="xl" variant="darkOutline">
                <Link to="/login" data-testid="hero-login-cta">I already have an account</Link>
              </Button>
            )}
          </div>
          <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {[["Sessions", "10–60 min"], ["Train in", "Gym, room, home"], ["Equipment", "Optional"]].map(([k, v]) => (
              <div key={k}>
                <dt className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{k}</dt>
                <dd className="mt-1.5 font-mono text-sm font-bold text-white sm:text-base">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative animate-rise lg:col-span-6" style={{ animationDelay: "200ms" }}>
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <img src={HERO} alt="Student skipping with a jump rope in a bright living room"
              className="aspect-[4/3] w-full object-cover lg:aspect-[4/5]" />
          </div>
          <div aria-hidden="true" className="absolute -top-5 left-5 flex items-center gap-2 rounded-full border border-white/15 bg-night/90 px-4 py-2 text-sm text-slate-200 shadow-xl backdrop-blur-xl">
            <CalendarClock className="h-4 w-4 text-emerald-300" />Moved to Thu · 12:00
            <span className="ml-1 font-semibold text-white underline underline-offset-4">Undo</span>
          </div>
          <div aria-hidden="true" className="absolute -bottom-8 left-4 right-4 rounded-2xl border border-white/10 bg-night/95 p-5 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-6 sm:w-80">
            <p className="font-label text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Next session</p>
            <p className="mt-2 font-display text-xl font-semibold text-white">Full body</p>
            <p className="font-mono text-sm text-emerald-300">Wed · 17:30 · 20 min</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-slate-300">6 exercises</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">
                <Play className="h-4 w-4" />Start
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="font-label text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">How it works</p>
          <h2 id="how-title" className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Three steps. Then just press Start.
          </h2>
          <p className="mt-4 text-slate-600">Planning takes about five minutes. After that, the next action is always one tap away.</p>
        </div>
        <ol className="grid gap-5 sm:grid-cols-3 lg:col-span-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="group rounded-2xl border border-slate-200 bg-white p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-slate-500">0{i + 1}</span>
                <s.icon className="h-6 w-6 text-slate-900" aria-hidden="true" />
              </div>
              <h3 className="mt-10 font-display text-xl font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function MiniWeek() {
  const cells = [["Mon", "done"], ["Tue", ""], ["Wed", "moved"], ["Thu", "new"], ["Fri", "plan"], ["Sat", ""], ["Sun", ""]];
  return (
    <div className="mt-8 grid grid-cols-7 gap-2" aria-hidden="true">
      {cells.map(([d, s]) => (
        <div key={d} className="flex flex-col items-center gap-2">
          <span className="font-label text-xs font-semibold uppercase text-slate-600">{d}</span>
          <span className={`h-16 w-full rounded-lg border ${
            s === "done" ? "border-emerald-300 bg-emerald-100" : s === "moved" ? "border-dashed border-slate-300 bg-white"
              : s === "new" ? "border-slate-900 bg-slate-900" : s === "plan" ? "border-slate-300 bg-slate-100" : "border-slate-200 bg-white"}`} />
        </div>
      ))}
    </div>
  );
}

function Features() {
  return (
    <section aria-labelledby="features-title" className="border-y border-slate-200 bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="font-label text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">What you get</p>
        <h2 id="features-title" className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Built for weeks that never go to plan.
        </h2>
        <div className="mt-14 grid gap-5 lg:grid-cols-12">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-8 lg:col-span-7 lg:p-10">
            <CalendarClock className="h-6 w-6" aria-hidden="true" />
            <h3 className="mt-6 font-display text-2xl font-semibold">Reschedule without the guilt</h3>
            <p className="mt-2 max-w-md text-slate-600">Every session has a Reschedule button. Missed one? Move it, or carry on with the next. No streak shaming.</p>
            <MiniWeek />
          </article>
          <article className="on-dark relative overflow-hidden rounded-3xl bg-obsidian text-white lg:col-span-5">
            <img src={GUIDED} alt="Woman doing a push-up outdoors" className="h-56 w-full object-cover opacity-80" />
            <div className="p-8">
              <Timer className="h-6 w-6 text-emerald-300" aria-hidden="true" />
              <h3 className="mt-4 font-display text-2xl font-semibold">Guided, one exercise at a time</h3>
              <p className="mt-2 text-slate-300">Photos, short steps, a rest timer you can pause, and a swap button for anything that doesn't suit you.</p>
            </div>
          </article>
          <article className="rounded-3xl border border-slate-200 p-8 lg:col-span-5 lg:p-10">
            <BarChart3 className="h-6 w-6" aria-hidden="true" />
            <h3 className="mt-6 font-display text-2xl font-semibold">Progress, not pressure</h3>
            <p className="mt-2 text-slate-600">See planned versus completed sessions. No weight, no body measurements. Streaks are optional and easy to hide.</p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800">
              <EyeOff className="h-4 w-4" aria-hidden="true" />Streaks can be hidden any time
            </p>
          </article>
          <article className="grid overflow-hidden rounded-3xl border border-slate-200 sm:grid-cols-2 lg:col-span-7">
            <img src={PEERS} alt="Two students walking together in a park with backpacks" className="h-64 w-full object-cover sm:h-full" />
            <div className="p-8 lg:p-10">
              <Users className="h-6 w-6" aria-hidden="true" />
              <h3 className="mt-6 font-display text-2xl font-semibold">Peers, only if you want them</h3>
              <p className="mt-2 text-slate-600">Add classmates by username, send a "Well done" and join small group challenges. Nothing is public.</p>
              <p className="mt-6 flex items-start gap-2 text-sm text-slate-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Your schedule, goal and progress stay private by default.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const home = user ? homeFor(user) : null;
  return (
    <div className="min-h-screen bg-background">
      <SkipLink />
      <header className="on-dark absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo inverted />
          <nav aria-label="Account" className="flex items-center gap-2">
            {home ? (
              <Button asChild variant="accent"><Link to={home} data-testid="landing-dashboard-link">Go to dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="darkGhost"><Link to="/login" data-testid="landing-login-link">Log in</Link></Button>
                <Button asChild variant="accent"><Link to="/register" data-testid="landing-signup-link">Sign up</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Hero home={home} />
        <HowItWorks />
        <Features />
        <section className="on-dark bg-obsidian py-20 text-white">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <h2 className="max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">Plan this week in under five minutes.</h2>
            <Button asChild size="xl" variant="accent">
              <Link to={home || "/register"} data-testid="closing-cta">{home ? "Open my dashboard" : "Get started"}<ArrowRight aria-hidden="true" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>CampusFit Planner · prototype with sample exercise content</p>
          <p>General fitness guidance only. It doesn't replace medical advice.</p>
        </div>
      </footer>
    </div>
  );
}
