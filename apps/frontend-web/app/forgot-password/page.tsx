"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ApiError, apiClient } from "@/lib/api/client";

type ForgotPasswordResponse = {
  message?: string;
};

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const payload = identifier.includes("@")
        ? { email: identifier.trim() }
        : { phoneNumber: identifier.trim() };
      const response = await apiClient.post<ForgotPasswordResponse, typeof payload>("/auth/forgot-password", payload);
      setSuccess(response.message || "If the account exists, a reset OTP was sent.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not request password reset.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">Account recovery</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-300">Request a password reset OTP using your email or phone number.</p>

        <label className="mt-8 block text-sm font-medium text-slate-200">
          Email or phone number
          <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-blue-400 transition focus:ring-2" placeholder="you@example.com or +989120000000" />
        </label>

        {error && <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
        {success && <p className="mt-4 rounded-xl bg-emerald-500/15 p-3 text-sm text-emerald-200">{success}</p>}

        <button disabled={isLoading} className="mt-6 w-full rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? "Sending..." : "Send reset OTP"}
        </button>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-300">
          <Link href="/verify-otp" className="hover:text-white">Verify OTP</Link>
          <Link href="/login" className="hover:text-white">Back to login</Link>
        </div>
      </form>
    </main>
  );
}
