
import { useEffect, useState } from "react";
import {
  Boxes,
  Eye,
  EyeOff,
  LoaderCircle,
  LogIn,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import App from "@/App";
import {
  authApi,
  clearToken,
  getToken,
  saveToken,
} from "@/lib/api";

export default function AuthGate() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      if (!getToken()) {
        setCheckingSession(false);
        return;
      }

      try {
        const currentUser = await authApi.me();

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        clearToken();
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (mode === "register") {
      if (password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setSubmitting(true);

    try {
      if (mode === "register") {
        await authApi.register({
          name: name.trim(),
          email: email.trim(),
          password,
        });

        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setMessage("Account created successfully. Please sign in.");
        return;
      }

      const result = await authApi.login({
        email: email.trim(),
        password,
      });

      saveToken(result.access_token);

      try {
        const currentUser = await authApi.me();
        setUser(currentUser);
        setPassword("");
      } catch (err) {
        clearToken();
        throw err;
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
    setMode("login");
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoaderCircle className="animate-spin text-zinc-700" size={28} />
      </div>
    );
  }

  if (user) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-zinc-500">
              {user.email} · {user.role}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>

     <App user={user} />
      </div>
    );
  }

  const isRegister = mode === "register";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-950 text-white">
            <Boxes size={25} />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight">Stockwise</h1>
            <p className="text-sm text-zinc-500">
              Sales & Inventory Management
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight">
          {isRegister ? "Create your account" : "Welcome back"}
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          {isRegister
            ? "Register to start managing sales and inventory."
            : "Sign in to manage products, customers and sales orders."}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-lg bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              !isRegister
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500"
            }`}
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              isRegister
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isRegister && (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full name
              </label>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={1}
                maxLength={150}
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  isRegister ? "new-password" : "current-password"
                }
                placeholder={
                  isRegister ? "At least 8 characters" : "Enter your password"
                }
                className="pr-11"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={isRegister ? 8 : undefined}
              />

              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-950"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium"
              >
                Confirm password
              </label>

              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className="pr-11"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  required
                  minLength={8}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((visible) => !visible)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-950"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
          )}

          {message && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <LoaderCircle className="mr-2 animate-spin" size={17} />
            ) : isRegister ? (
              <UserPlus className="mr-2" size={17} />
            ) : (
              <LogIn className="mr-2" size={17} />
            )}

            {submitting
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-zinc-500">
          {isRegister
            ? "New accounts are assigned the sales role."
            : "Managers and sales users sign in using their registered credentials."}
        </p>
      </section>
    </main>
  );
}
