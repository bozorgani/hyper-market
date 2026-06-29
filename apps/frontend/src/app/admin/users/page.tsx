"use client";

import { useMemo, useState } from "react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AccountStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAdminUsers, useBlockUser, useUnblockUser } from "@/features/admin/admin-api";
import { translateRole } from "@/lib/utils";
import type { User } from "@/types/domain";

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const { showToast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const selectedUserId = selectedUser?.id ?? selectedUser?._id ?? "";
  const selectedUserIsSuspended = selectedUser?.accountStatus === "suspended";
  const isMutationPending = blockUser.isPending || unblockUser.isPending;
  const errorMessage = users.error instanceof Error ? users.error.message : "امکان دریافت لیست کاربران وجود ندارد.";

  const filteredUsers = useMemo(() => {
    return (users.data ?? []).filter((user) => {
      const id = user.id ?? user._id ?? "";
      const queryValue = query.trim().toLowerCase();
      const matchesQuery = queryValue
        ? [id, user.email ?? "", user.phoneNumber ?? ""].some((value) => value.toLowerCase().includes(queryValue))
        : true;
      const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;
      const matchesStatus = statusFilter === "all" ? true : (user.accountStatus ?? "") === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users.data, query, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function toggleUserBlock() {
    if (!selectedUserId) return;

    try {
      if (selectedUserIsSuspended) {
        await unblockUser.mutateAsync(selectedUserId);
        showToast({ type: "success", title: "کاربر رفع مسدودی شد" });
      } else {
        await blockUser.mutateAsync(selectedUserId);
        showToast({ type: "success", title: "کاربر مسدود شد" });
      }
      setSelectedUser(null);
    } catch (error) {
      showToast({ type: "error", title: "عملیات مدیریت کاربر ناموفق بود", description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <main className="space-y-5 text-right">
      <PageHeader title="مدیریت کاربران" description="جستجو، فیلتر، بررسی نقش و مدیریت مسدودسازی/رفع مسدودی کاربران فروشگاه" />

      <Card className="p-4">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="جستجو بر اساس شناسه، ایمیل یا شماره موبایل..." />
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="all">همه نقش‌ها</option>
            <option value="customer">مشتری</option>
            <option value="admin">مدیر</option>
            <option value="super_admin">مدیر ارشد</option>
            <option value="vendor">فروشنده</option>
            <option value="delivery">ارسال‌کننده</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="suspended">مسدود</option>
            <option value="pending">در انتظار</option>
            <option value="deactivated">غیرفعال</option>
          </select>
          <Button type="button" variant="outline" onClick={() => { setQuery(""); setRoleFilter("all"); setStatusFilter("all"); setPage(1); }}>پاک‌کردن فیلترها</Button>
        </div>
      </Card>

      {users.isError ? <ErrorState title="امکان دریافت لیست کاربران وجود ندارد" description={errorMessage} actions={<Button type="button" variant="outline" onClick={() => users.refetch()}>تلاش مجدد</Button>} /> : null}

      {!users.isError ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 text-sm text-slate-500">
            <p>فهرست کاربران</p>
            <p>{filteredUsers.length} مورد</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">کاربر</th><th className="p-4">ایمیل</th><th className="p-4">موبایل</th><th className="p-4">نقش</th><th className="p-4">وضعیت</th><th className="p-4">عملیات</th></tr></thead>
              <tbody>
                {users.isLoading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}><td className="p-4" colSpan={6}><Skeleton className="h-10 w-full" /></td></tr>) : null}
                {!users.isLoading && paginatedUsers.map((user) => {
                  const id = user.id ?? user._id ?? "unknown";
                  const isSuspended = user.accountStatus === "suspended";
                  return (
                    <tr key={id} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                      <td className="p-4 ltr text-left font-mono text-xs">{id}</td>
                      <td className="p-4">{user.email ?? "-"}</td>
                      <td className="p-4">{user.phoneNumber ?? "-"}</td>
                      <td className="p-4">{translateRole(user.role)}</td>
                      <td className="p-4"><AccountStatusBadge status={user.accountStatus} /></td>
                      <td className="p-4"><Button type="button" variant={isSuspended ? "outline" : "destructive"} disabled={id === "unknown" || isMutationPending} onClick={() => setSelectedUser(user)}>{isSuspended ? "رفع مسدودی" : "مسدودسازی"}</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!users.isLoading && filteredUsers.length === 0 ? (
            <div className="p-4">
              <EmptyState title="کاربری یافت نشد" description="فیلترها را تغییر دهید تا کاربرهای بیشتری نمایش داده شوند." actions={<Button type="button" onClick={() => { setQuery(""); setRoleFilter("all"); setStatusFilter("all"); setPage(1); }}>بازنشانی فیلترها</Button>} />
            </div>
          ) : null}
          {!users.isLoading && filteredUsers.length > 0 ? <AdminPagination page={page} totalPages={totalPages} totalItems={filteredUsers.length} pageSize={PAGE_SIZE} onPageChange={setPage} /> : null}
        </Card>
      ) : null}

      <ConfirmDialog
        open={Boolean(selectedUser)}
        title={selectedUserIsSuspended ? "رفع مسدودی کاربر" : "مسدودسازی کاربر"}
        description={selectedUserIsSuspended ? `آیا از رفع مسدودی کاربر «${selectedUser?.email ?? selectedUser?.phoneNumber ?? selectedUserId}» مطمئن هستید؟` : `آیا از مسدودسازی کاربر «${selectedUser?.email ?? selectedUser?.phoneNumber ?? selectedUserId}» مطمئن هستید؟ با این کار نشست‌های بعدی او بی‌اعتبار می‌شوند.`}
        confirmText={selectedUserIsSuspended ? "رفع مسدودی" : "مسدودسازی"}
        destructive={!selectedUserIsSuspended}
        loading={isMutationPending}
        onConfirm={toggleUserBlock}
        onCancel={() => setSelectedUser(null)}
      />
    </main>
  );
}
