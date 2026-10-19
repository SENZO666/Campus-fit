import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-10 font-display text-4xl font-bold tracking-tight">We couldn't find that page</h1>
        <p className="mt-3 text-slate-600">The link may be old, or the page has moved.</p>
        <Button asChild size="lg" className="mt-8"><Link to="/" data-testid="not-found-home-link">Go to the home page</Link></Button>
      </div>
    </main>
  );
}
