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
      setMessage("کد تأیید با موفقیت ثبت شد.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "تأیید کد ناموفق بود.");
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6 text-right">
        <h1 className="text-2xl font-black">تأیید کد یک‌بارمصرف</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">کد ارسال‌شده به ایمیل یا موبایل را وارد کنید.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="ایمیل یا شماره موبایل" required />
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-right text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100">
            <option value="email_verify">تأیید ایمیل</option>
            <option value="phone_verify">تأیید موبایل</option>
            <option value="password_reset">بازیابی رمز عبور</option>
          </select>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="کد ۶ رقمی" required maxLength={6} inputMode="numeric" />
          {message && <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{message}</p>}
          <Button className="w-full">تأیید</Button>
        </form>
      </Card>
    </main>
  );
}
