import "@/App.css";
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/AppShell";
import { AnnouncerProvider } from "@/context/Announcer";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import PlanBuilder from "@/pages/PlanBuilder";
import Calendar from "@/pages/Calendar";
import Workout from "@/pages/Workout";
import Progress from "@/pages/Progress";
import Library from "@/pages/Library";
import Peers from "@/pages/Peers";
import Challenges from "@/pages/Challenges";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";

export function FullPageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-background" role="status" data-testid="page-loader">
      <span className="font-mono text-sm text-slate-600">Loading CampusFit…</span>
    </div>
  );
}

function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  if (user === null) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: path }} />;
  const isAdmin = user.role === "admin";
  if (isAdmin && !path.startsWith("/admin")) return <Navigate to="/admin" replace />;
  if (!isAdmin && path.startsWith("/admin")) return <Navigate to="/dashboard" replace />;
  if (!isAdmin && !user.onboarded && path !== "/onboarding") return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/onboarding", element: <Onboarding /> },
      { path: "/workout/:sessionId", element: <Workout /> },
      {
        element: <AppShell />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/plan", element: <PlanBuilder /> },
          { path: "/calendar", element: <Calendar /> },
          { path: "/library", element: <Library /> },
          { path: "/progress", element: <Progress /> },
          { path: "/peers", element: <Peers /> },
          { path: "/challenges", element: <Challenges /> },
          { path: "/settings", element: <Settings /> },
          { path: "/admin", element: <Admin /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

function App() {
  return (
    <AuthProvider>
      <AnnouncerProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" theme="light" closeButton toastOptions={{ className: "font-sans" }} />
      </AnnouncerProvider>
    </AuthProvider>
  );
}

export default App;
