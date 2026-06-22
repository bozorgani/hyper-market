"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const credentials = identifier.includes("@")
        ? { email: identifier.trim(), password }
        : { phoneNumber: identifier.trim(), password };

      await login(credentials);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">Welcome back</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Login</h1>
        <p className="mt-2 text-sm text-slate-300">Use your email or phone number to access your dashboard.</p>

        <label className="mt-8 block text-sm font-medium text-slate-200">
          Email or phone number
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-blue-400 transition focus:ring-2"
            placeholder="admin@example.com or +989120000000"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-200">
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-blue-400 transition focus:ring-2"
            placeholder="••••••••"
          />
        </label>

        {error && <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}

        <button
          disabled={isLoading}
          className="mt-6 w-full rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-300">
          <Link href="/forgot-password" className="hover:text-white">Forgot password?</Link>
          <Link href="/register" className="hover:text-white">Create account</Link>
        </div>
      </form>
    </main>
  );
}
