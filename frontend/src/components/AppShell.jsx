import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays, ChevronDown, ClipboardList, Dumbbell, Flag, LayoutDashboard, LogOut, Menu, Settings, ShieldAlert, TrendingUp, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/Logo";
import { SkipLink } from "@/components/SkipLink";
import { useAuth } from "@/context/AuthContext";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const STUDENT_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/plan", label: "Plan", icon: ClipboardList },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/library", label: "Library", icon: Dumbbell },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/peers", label: "Peers", icon: Users },
  { to: "/challenges", label: "Challenges", icon: Flag },
];
const ADMIN_NAV = [{ to: "/admin", label: "Reports", icon: ShieldAlert }];

function NavItems({ items, vertical, onNavigate }) {
  return (
    <ul className={cn(vertical ? "flex flex-col gap-1" : "flex items-center gap-1")}>
      {items.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            onClick={onNavigate}
            data-testid={`nav-${label.toLowerCase()}-link${vertical ? "-mobile" : ""}`}
            className={({ isActive }) => cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-200",
              vertical && "w-full px-4 py-3 text-base",
              isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function UserMenu({ user, onLogout }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 pl-1.5 pr-3" data-testid="user-menu-trigger">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 font-mono text-xs font-bold text-slate-950" aria-hidden="true">
            {initials(user.name)}
          </span>
          <span className="hidden text-sm sm:inline">{user.name}</span>
          <span className="sr-only">Account menu</span>
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block font-semibold">{user.name}</span>
          <span className="block font-mono text-xs font-normal text-slate-600">@{user.username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role !== "admin" && (
          <DropdownMenuItem asChild>
            <Link to="/settings" data-testid="user-menu-settings-link"><Settings aria-hidden="true" />Settings and privacy</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onLogout} data-testid="user-menu-logout-button">
          <LogOut aria-hidden="true" />Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const items = user.role === "admin" ? ADMIN_NAV : STUDENT_NAV;

  useEffect(() => {
    window.scrollTo(0, 0);
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SkipLink />
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to={items[0].to} aria-label="CampusFit Planner, go to dashboard" data-testid="header-logo-link">
            <Logo />
          </Link>
          <nav aria-label="Main" className="ml-4 hidden xl:block">
            <NavItems items={items} />
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <UserMenu user={user} onLogout={handleLogout} />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="xl:hidden" data-testid="mobile-menu-button">
                  <Menu aria-hidden="true" />Menu
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="font-display text-xl">Menu</SheetTitle>
                  <SheetDescription>Go to any part of CampusFit.</SheetDescription>
                </SheetHeader>
                <nav aria-label="Main" className="mt-6">
                  <NavItems items={items} vertical onNavigate={() => setMenuOpen(false)} />
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main id="main-content" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>CampusFit Planner · prototype with sample exercise content</p>
          <p>General fitness guidance only. It doesn't replace medical advice.</p>
        </div>
      </footer>
    </div>
  );
}
