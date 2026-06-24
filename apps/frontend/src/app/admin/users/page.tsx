"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { translateAccountStatus, translateRole } from "@/lib/utils";
import { useAdminUsers, useBlockUser, useUnblockUser } from "@/features/admin/admin-api";

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const [message, setMessage] = useState("");

  async function toggleUserBlock(id: string, isSuspended: boolean) {
    setMessage("");

    try {
      if (isSuspended) {
        await unblockUser.mutateAsync(id);
        setMessage("کاربر با موفقیت رفع مسدودی شد.");
        return;
      }

      await blockUser.mutateAsync(id);
      setMessage("کاربر با موفقیت مسدود شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "عملیات مدیریت کاربر ناموفق بود.");
    }
  }

  return (
    <main className="space-y-5 text-right">
      <div>
        <h1 className="text-2xl font-black">مدیریت کاربران</h1>
        <p className="mt-2 text-sm text-slate-500">لیست کاربران از API دریافت می‌شود و مسدودسازی/رفع مسدودی به‌صورت واقعی در بک‌اند ذخیره می‌شود.</p>
      </div>

      {message ? <Card className="p-4 text-slate-700">{message}</Card> : null}
      {users.isError ? (
        <Card className="p-5 text-red-600">امکان دریافت لیست کاربران وجود ندارد.</Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">کاربر</th>
                <th className="p-4">ایمیل</th>
                <th className="p-4">موبایل</th>
                <th className="p-4">نقش</th>
                <th className="p-4">وضعیت</th>
                <th className="p-4">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.isLoading ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={6}>در حال بارگذاری کاربران...</td>
                </tr>
              ) : null}
              {(users.data ?? []).map((user) => {
                const id = user.id ?? user._id ?? "unknown";
                const isSuspended = user.accountStatus === "suspended";
                const isMutationPending = blockUser.isPending || unblockUser.isPending;

                return (
                  <tr key={id}>
                    <td className="p-4 ltr text-left font-mono text-xs">{id}</td>
                    <td className="p-4">{user.email ?? "-"}</td>
                    <td className="p-4">{user.phoneNumber ?? "-"}</td>
                    <td className="p-4">{translateRole(user.role)}</td>
                    <td className="p-4">
                      <Badge className={isSuspended ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}>
                        {translateAccountStatus(user.accountStatus)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Button
                        variant={isSuspended ? "outline" : "destructive"}
                        disabled={id === "unknown" || isMutationPending}
                        onClick={() => toggleUserBlock(id, isSuspended)}
                      >
                        {isSuspended ? "رفع مسدودی" : "مسدودسازی"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {users.data?.length === 0 ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={6}>هنوز کاربری ثبت نشده است.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
