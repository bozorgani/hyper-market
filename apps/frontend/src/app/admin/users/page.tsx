"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { translateRole } from "@/lib/utils";
import { useAdminUsers } from "@/features/admin/admin-api";

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const [blockedUsers, setBlockedUsers] = useState<Record<string, boolean>>({});

  return (
    <main className="space-y-5 text-right">
      <div>
        <h1 className="text-2xl font-black">مدیریت کاربران</h1>
        <p className="mt-2 text-sm text-slate-500">لیست کاربران از API موجود دریافت می‌شود؛ مسدودسازی تا آماده شدن API به‌صورت UI است.</p>
      </div>
      {users.isError ? (
        <Card className="p-5 text-amber-700">API لیست کاربران در بک‌اند فعلی فعال نیست. پس از فعال شدن، همین صفحه داده‌ها را نمایش می‌دهد.</Card>
      ) : null}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">کاربر</th><th className="p-4">ایمیل</th><th className="p-4">موبایل</th><th className="p-4">نقش</th><th className="p-4">وضعیت</th><th className="p-4">عملیات</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(users.data ?? []).map((user) => {
                const id = user.id ?? user._id ?? "unknown";
                return (
                  <tr key={id}>
                    <td className="p-4 ltr text-left font-mono text-xs">{id}</td>
                    <td className="p-4">{user.email ?? "-"}</td>
                    <td className="p-4">{user.phoneNumber ?? "-"}</td>
                    <td className="p-4">{translateRole(user.role)}</td>
                    <td className="p-4"><Badge>{blockedUsers[id] ? "مسدود" : user.accountStatus ?? "فعال"}</Badge></td>
                    <td className="p-4"><Button variant="outline" onClick={() => setBlockedUsers({ ...blockedUsers, [id]: !blockedUsers[id] })}>{blockedUsers[id] ? "رفع مسدودی" : "مسدودسازی"}</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
