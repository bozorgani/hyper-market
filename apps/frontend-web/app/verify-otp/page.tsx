"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ApiError, apiClient } from "@/lib/api/client";

const otpTypes = [
  { label: "Email verification", value: "email_verify" },
  { label: "Phone verification", value: "phone_verify" },
  { label: "Password reset", value: "password_reset" },
];

type VerifyOtpResponse = {
  message?: string;
};

export default function VerifyOtpPage() {
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("email_verify");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await apiClient.post<VerifyOtpResponse, { target: string; code: string; type: string }>("/auth/verify-otp", {
        target: target.trim(),
        code: code.trim(),
        type,
      });
      setSuccess(response.message || "OTP verified successfully.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "OTP verification failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">Security check</p>
        <h1 className="mt-3 text-3xl font-bold text-white">Verify OTP</h1>
        <p className="mt-2 text-sm text-slate-300">Enter the target and 6-digit code sent by the backend flow.</p>

        <label className="mt-8 block text-sm font-medium text-slate-200">
          Target
          <input value={target} onChange={(event) => setTarget(event.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-blue-400 transition focus:ring-2" placeholder="email or phone" />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-200">
          OTP type
          <select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-blue-400 transition focus:ring-2">
            {otpTypes.map((otpType) => <option key={otpType.value} value={otpType.value}>{otpType.label}</option>)}
          </select>
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-200">
          Code
          <input value={code} onChange={(event) => setCode(event.target.value)} required inputMode="numeric" maxLength={6} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-blue-400 transition focus:ring-2" placeholder="123456" />
        </label>

        {error && <p className="mt-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
        {success && <p className="mt-4 rounded-xl bg-emerald-500/15 p-3 text-sm text-emerald-200">{success}</p>}

        <button disabled={isLoading} className="mt-6 w-full rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60">
          {isLoading ? "Verifying..." : "Verify code"}
        </button>

        <p className="mt-6 text-center text-sm text-slate-300"><Link href="/login" className="text-white hover:underline">Back to login</Link></p>
      </form>
    </main>
  );
}
