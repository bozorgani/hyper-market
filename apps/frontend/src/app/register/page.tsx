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
      setError(err instanceof Error ? err.message : "ثبت‌نام ناموفق بود. اطلاعات را بررسی کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6 text-right">
        <h1 className="text-2xl font-black">ثبت‌نام در هایپرمارکت</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">پس از ثبت‌نام، کد تأیید را وارد کنید.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ایمیل" type="email" />
          <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="شماره موبایل مثل 0912..." />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور قوی" type="password" required />
          {error && <p className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-600">{error}</p>}
          <Button className="w-full" disabled={loading}>{loading ? "در حال ثبت..." : "ثبت‌نام"}</Button>
        </form>
        <p className="mt-5 text-sm text-slate-500">حساب دارید؟ <Link href="/login" className="font-semibold text-rose-600">وارد شوید</Link></p>
      </Card>
    </main>
  );
}
