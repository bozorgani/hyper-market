"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, ShieldOff, ShieldCheck, RefreshCw, Users } from "lucide-react";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AccountStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
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
      showToast({ type: "error", title: "عملیات ناموفق بود", description: error instanceof Error ? error.message : undefined });
    }
  }

  const roleColors: Record<string, string> = {
    customer: "bg-slate-100 text-slate-600",
    admin: "bg-emerald-50 text-emerald-700",
    super_admin: "bg-violet-50 text-violet-700",
    vendor: "bg-blue-50 text-blue-700",
    delivery: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-900">مدیریت کاربران</h1>
        <p className="mt-1 text-sm text-slate-500">جستجو، فیلتر و مدیریت مسدودسازی کاربران</p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="جستجو بر اساس شناسه، ایمیل یا شماره..." className="pr-10" />
          </div>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="all">همه نقش‌ها</option>
            <option value="customer">مشتری</option>
            <option value="admin">مدیر</option>
            <option value="super_admin">مدیر ارشد</option>
            <option value="vendor">فروشنده</option>
            <option value="delivery">ارسال‌کننده</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="suspended">مسدود</option>
            <option value="pending">در انتظار</option>
            <option value="deactivated">غیرفعال</option>
          </select>
          <button onClick={() => { setQuery(""); setRoleFilter("all"); setStatusFilter("all"); setPage(1); }} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> پاک‌کردن
          </button>
        </div>
      </div>

      {users.isError ? (
        <ErrorState title="بارگذاری کاربران انجام نشد" description={errorMessage} actions={<Button type="button" variant="outline" onClick={() => users.refetch()}>تلاش مجدد</Button>} />
      ) : null}

      {!users.isError && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">فهرست کاربران</span>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{filteredUsers.length} مورد</span>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">شناسه</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">ایمیل</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">موبایل</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">نقش</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">وضعیت</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-slate-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.isLoading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}><td className="p-5" colSpan={6}><Skeleton className="h-12 w-full rounded-xl" /></td></tr>) : null}
                {!users.isLoading && paginatedUsers.map((user) => {
                  const id = user.id ?? user._id ?? "unknown";
                  const isSuspended = user.accountStatus === "suspended";
                  return (
                    <motion.tr key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="transition hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 ltr text-left font-mono text-xs text-slate-500">{id.slice(0, 12)}...</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{user.email ?? "-"}</td>
                      <td className="px-5 py-3.5 text-slate-600">{user.phoneNumber ?? "-"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${roleColors[user.role] ?? "bg-slate-100 text-slate-600"}`}>
                          {translateRole(user.role)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5"><AccountStatusBadge status={user.accountStatus} /></td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setSelectedUser(user)}
                          disabled={id === "unknown" || isMutationPending}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            isSuspended
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          {isSuspended ? <><ShieldCheck className="h-3.5 w-3.5" /> رفع مسدودی</> : <><ShieldOff className="h-3.5 w-3.5" /> مسدودسازی</>}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-slate-50">
            {users.isLoading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="p-4"><Skeleton className="h-24 w-full rounded-xl" /></div>) : null}
            {!users.isLoading && paginatedUsers.map((user) => {
              const id = user.id ?? user._id ?? "unknown";
              const isSuspended = user.accountStatus === "suspended";
              return (
                <div key={id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-800">{user.email ?? user.phoneNumber ?? "-"}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${roleColors[user.role] ?? "bg-slate-100 text-slate-600"}`}>{translateRole(user.role)}</span>
                        <AccountStatusBadge status={user.accountStatus} />
                      </div>
                    </div>
                    <button onClick={() => setSelectedUser(user)} disabled={id === "unknown" || isMutationPending} className={`mr-3 rounded-lg p-2 transition ${isSuspended ? "text-emerald-600 hover:bg-emerald-50" : "text-red-500 hover:bg-red-50"}`}>
                      {isSuspended ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!users.isLoading && filteredUsers.length === 0 ? (
            <div className="p-8"><EmptyState title="کاربری یافت نشد" description="فیلترها را تغییر دهید." actions={<Button type="button" onClick={() => { setQuery(""); setRoleFilter("all"); setStatusFilter("all"); setPage(1); }}>بازنشانی فیلترها</Button>} /></div>
          ) : null}
          {!users.isLoading && filteredUsers.length > 0 ? <AdminPagination page={page} totalPages={totalPages} totalItems={filteredUsers.length} pageSize={PAGE_SIZE} onPageChange={setPage} /> : null}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(selectedUser)}
        title={selectedUserIsSuspended ? "رفع مسدودی کاربر" : "مسدودسازی کاربر"}
        description={selectedUserIsSuspended ? `آیا از رفع مسدودی کاربر «${selectedUser?.email ?? selectedUser?.phoneNumber ?? selectedUserId}» مطمئن هستید؟` : `آیا از مسدودسازی کاربر «${selectedUser?.email ?? selectedUser?.phoneNumber ?? selectedUserId}» مطمئن هستید؟`}
        confirmText={selectedUserIsSuspended ? "رفع مسدودی" : "مسدودسازی"}
        destructive={!selectedUserIsSuspended}
        loading={isMutationPending}
        onConfirm={toggleUserBlock}
        onCancel={() => setSelectedUser(null)}
      />
    </div>
  );
}