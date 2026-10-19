import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout, homeFor } from "@/components/AuthLayout";
import { TextField } from "@/components/FormField";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api";

export function FormAlert({ children, testid }) {
  if (!children) return null;
  return (
    <div role="alert" data-testid={testid} className="mb-6 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function PasswordToggle({ shown, onToggle, testid }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onToggle} className="mt-2 px-2" data-testid={testid} aria-pressed={shown}>
      {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      {shown ? "Hide password" : "Show password"}
    </Button>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  if (user) return <Navigate to={location.state?.from || homeFor(user)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.email.trim()) errs.email = "Enter your email address.";
    if (!form.password) errs.password = "Enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(errs.email ? "login-email" : "login-password")?.focus();
      return;
    }
    setBusy(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your week and your next session."
      footer={<>New to CampusFit? <Link to="/register" className="font-semibold text-indigo-700 underline underline-offset-4" data-testid="login-register-link">Create an account</Link></>}
    >
      <FormAlert testid="login-error">{errors.form}</FormAlert>
      <form onSubmit={submit} noValidate className="space-y-6">
        <TextField id="login-email" label="Email" type="email" autoComplete="email" value={form.email}
          onChange={set("email")} error={errors.email} testid="login-email-input" />
        <div>
          <TextField id="login-password" label="Password" type={showPw ? "text" : "password"} autoComplete="current-password"
            value={form.password} onChange={set("password")} error={errors.password} testid="login-password-input" />
          <PasswordToggle shown={showPw} onToggle={() => setShowPw(!showPw)} testid="login-toggle-password" />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy} data-testid="login-submit-button">
          {busy ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
