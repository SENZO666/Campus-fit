import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuthLayout, homeFor } from "@/components/AuthLayout";
import { TextField } from "@/components/FormField";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api";
import { FormAlert, PasswordToggle } from "@/pages/Login";

const FIELDS = ["name", "username", "email", "password"];

function validate(form) {
  const errs = {};
  if (!form.name.trim()) errs.name = "Enter the name peers will see.";
  const username = form.username.trim().toLowerCase().replace(/^@/, "");
  if (!username) errs.username = "Choose a username.";
  else if (!/^[a-z0-9_]{3,20}$/.test(username)) errs.username = "Use 3–20 lowercase letters, numbers or underscores.";
  if (!form.email.trim()) errs.email = "Enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Enter an email address like name@university.ac.za.";
  if (form.password.length < 8) errs.password = "Use at least 8 characters for your password.";
  return errs;
}

export default function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    const first = FIELDS.find((f) => errs[f]);
    if (first) {
      document.getElementById(`register-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await register({ ...form, username: form.username.trim().toLowerCase().replace(/^@/, ""), email: form.email.trim() });
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes a minute. Then we'll plan a week that fits your timetable."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-indigo-700 underline underline-offset-4" data-testid="register-login-link">Log in</Link></>}
    >
      <FormAlert testid="register-error">{errors.form}</FormAlert>
      <form onSubmit={submit} noValidate className="space-y-6">
        <TextField id="register-name" label="Display name" autoComplete="name" value={form.name}
          onChange={set("name")} error={errors.name} testid="register-name-input" hint="Shown to peers you accept." />
        <TextField id="register-username" label="Username" autoComplete="username" value={form.username}
          onChange={set("username")} error={errors.username} testid="register-username-input"
          hint="Classmates find you with this exact username. 3–20 lowercase letters, numbers or underscores." />
        <TextField id="register-email" label="Email" type="email" autoComplete="email" value={form.email}
          onChange={set("email")} error={errors.email} testid="register-email-input" />
        <div>
          <TextField id="register-password" label="Password" type={showPw ? "text" : "password"} autoComplete="new-password"
            value={form.password} onChange={set("password")} error={errors.password} testid="register-password-input"
            hint="At least 8 characters." />
          <PasswordToggle shown={showPw} onToggle={() => setShowPw(!showPw)} testid="register-toggle-password" />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy} data-testid="register-submit-button">
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
