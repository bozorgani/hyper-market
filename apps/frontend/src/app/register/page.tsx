"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/register", { ...(email ? { email } : {}), ...(phoneNumber ? { phoneNumber } : {}), password });
      router.push("/verify-otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-2xl font-black">Register</h1>
        <p className="mt-2 text-sm text-slate-500">Create account, then verify OTP.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
          <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone +98912..." />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Strong password" type="password" required />
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <Button className="w-full" disabled={loading}>{loading ? "Creating..." : "Register"}</Button>
        </form>
        <p className="mt-5 text-sm text-slate-500">Already registered? <Link href="/login" className="font-semibold text-rose-600">Login</Link></p>
      </Card>
    </main>
  );
}
