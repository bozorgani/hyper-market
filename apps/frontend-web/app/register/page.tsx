"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError, apiClient } from "@/lib/api/client";

type RegisterResponse = {
  message?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const payload = {
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phoneNumber.trim() ? { phoneNumber: phoneNumber.trim() } : {}),
        password,
      };

      const response = await apiClient.post<RegisterResponse, typeof payload>("/auth/register", payload);
      setSuccess(response.message || "Account created. Check your OTP and verify your account.");
      router.push("/verify-otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">Get started</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Create account</h1>
        <p className="mt-2 text-sm text-slate-300">Provide an email or phone number and a strong password.</p>

        <label className="mt-8 block text-sm font-medium text-slate-200">
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-blue-400 transition focus:ring-2"
            placeholder="you@example.com"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-200">
          Phone number
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-blue-400 transition focus:ring-2"
            placeholder="+989120000000"
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
            placeholder="Strong password"
          />
        </label>

        {error && <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
        {success && <p className="mt-4 rounded-xl bg-emerald-500/15 p-3 text-sm text-emerald-200">{success}</p>}

        <button disabled={isLoading} className="mt-6 w-full rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? "Creating..." : "Create account"}
        </button>

        <p className="mt-6 text-center text-sm text-slate-300">
          Already have an account? <Link href="/login" className="text-white hover:underline">Login</Link>
        </p>
      </form>
    </main>
  );
}
