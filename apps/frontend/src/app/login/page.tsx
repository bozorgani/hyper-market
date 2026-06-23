"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(identifier.includes("@") ? { email: identifier, password } : { phoneNumber: identifier, password });
      router.push("/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ورود ناموفق بود. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-6 text-right">
          <h1 className="text-2xl font-black">ورود به حساب</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">با ایمیل یا شماره موبایل وارد حساب کاربری شوید.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="ایمیل یا شماره موبایل مثل 0912..." required />
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="رمز عبور" type="password" required />
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-600">{error}</p>}
            <Button className="w-full" disabled={loading}>{loading ? "در حال ورود..." : "ورود"}</Button>
          </form>
          <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-500">
            <Link href="/register">ثبت‌نام</Link>
            <Link href="/verify-otp">تأیید کد پیامکی</Link>
          </div>
        </Card>
      </motion.div>
    </main>
  );
}
