"use client";

import { FormEvent, useState } from "react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function VerifyOtpPage() {
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("email_verify");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await api.post("/auth/verify-otp", { target, code, type });
      setMessage("OTP verified successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "OTP verification failed");
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-black">Verify OTP</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Email or phone" required />
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
            <option value="email_verify">Email verification</option>
            <option value="phone_verify">Phone verification</option>
            <option value="password_reset">Password reset</option>
          </select>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" required maxLength={6} />
          {message && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{message}</p>}
          <Button className="w-full">Verify</Button>
        </form>
      </Card>
    </main>
  );
}
