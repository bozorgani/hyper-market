"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "@/components/ui/csp-motion";
import {
  ChevronDown,
  KeyRound,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  usePermissionsMap,
  useGrantPermission,
  useRevokePermission,
  useSeedPermissions,
  type GrantPermissionInput,
  type RevokePermissionInput,
} from "@/features/admin/admin-api";
import { translateRole } from "@/lib/utils";

/** Role metadata for display */
const ROLE_META: Record<
  string,
  { label: string; icon: typeof Shield; color: string; bgClass: string; deprecated?: boolean }
> = {
  super_admin: {
    label: "مدیر ارشد",
    icon: ShieldCheck,
    color: "text-violet-700",
    bgClass: "bg-violet-50",
  },
  admin: {
    label: "مدیر",
    icon: Shield,
    color: "text-emerald-700",
    bgClass: "bg-emerald-50",
  },
  customer: {
    label: "مشتری",
    icon: KeyRound,
    color: "text-slate-600",
    bgClass: "bg-slate-100",
  },
  vendor: {
    label: "فروشنده",
    icon: ShieldAlert,
    color: "text-slate-400",
    bgClass: "bg-slate-100",
    deprecated: true,
  },
  delivery: {
    label: "ارسال‌کننده",
    icon: ShieldAlert,
    color: "text-slate-400",
    bgClass: "bg-slate-100",
    deprecated: true,
  },
};

const ACTIVE_ROLES = ["super_admin", "admin", "customer"];
const DEPRECATED_ROLES = ["vendor", "delivery"];

/** All known permissions for the "Add Permission" suggestion list */
const KNOWN_RESOURCES = [
  "products",
  "categories",
  "orders",
  "users",
  "payments",
  "analytics",
  "permissions",
  "search",
];
const KNOWN_ACTIONS = ["create", "read", "update", "delete", "ban"];

/** Translate permission name like "products.create" → "محصولات / ایجاد" */
function translatePermissionName(perm: string): string {
  if (perm === "*") return "دسترسی کامل (Wildcard)";
  const [resource, action] = perm.split(".");
  const resourceMap: Record<string, string> = {
    products: "محصولات",
    categories: "دسته‌بندی‌ها",
    orders: "سفارش‌ها",
    users: "کاربران",
    payments: "پرداخت‌ها",
    analytics: "آنالیتیکس",
    permissions: "دسترسی‌ها",
    search: "جستجو",
  };
  const actionMap: Record<string, string> = {
    create: "ایجاد",
    read: "مشاهده",
    update: "ویرایش",
    delete: "حذف",
    ban: "مسدودسازی",
  };
  return `${resourceMap[resource] ?? resource} / ${actionMap[action] ?? action ?? "*"}`;
}

export function AdminRolesClient() {
  const permissionsMap = usePermissionsMap();
  const grantPermission = useGrantPermission();
  const revokePermission = useRevokePermission();
  const seedPermissions = useSeedPermissions();
  const { showToast } = useToast();

  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showSeedDialog, setShowSeedDialog] = useState(false);

  // A11y: focus trap for Add Permission modal – Issue #22

  // Add permission form state
  const [formRole, setFormRole] = useState("admin");
  const [formResource, setFormResource] = useState("");
  const [formAction, setFormAction] = useState("");

  // Revoke permission state
  const [revokeTarget, setRevokeTarget] = useState<RevokePermissionInput | null>(null);

  const errorMessage =
    permissionsMap.error instanceof Error
      ? permissionsMap.error.message
      : "امکان دریافت نقش‌ها وجود ندارد.";

  // Build sorted role list: active first, then deprecated
  const roles = useMemo(() => {
    const map = permissionsMap.data ?? {};
    const allRoles = Object.keys(map);
    const active = ACTIVE_ROLES.filter((r) => allRoles.includes(r) || true);
    const deprecated = DEPRECATED_ROLES.filter((r) => allRoles.includes(r));
    const extra = allRoles.filter((r) => !active.includes(r) && !deprecated.includes(r));
    return [...active, ...extra, ...deprecated];
  }, [permissionsMap.data]);

  const permissionMap = permissionsMap.data ?? {};

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleGrantPermission() {
    if (!formResource.trim() || !formAction.trim()) {
      showToast({ type: "error", title: "لطفاً منبع و عمل را وارد کنید." });
      return;
    }
    const input: GrantPermissionInput = {
      role: formRole,
      permissionName: `${formResource.trim()}.${formAction.trim()}`,
      resource: formResource.trim(),
      action: formAction.trim(),
    };
    try {
      await grantPermission.mutateAsync(input);
      showToast({ type: "success", title: `دسترسی «${input.permissionName}» به نقش اضافه شد.` });
      setShowAddDialog(false);
      setFormResource("");
      setFormAction("");
    } catch (error) {
      showToast({
        type: "error",
        title: "افزودن دسترسی ناموفق بود",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function handleRevokePermission() {
    if (!revokeTarget) return;
    try {
      await revokePermission.mutateAsync(revokeTarget);
      showToast({ type: "success", title: `دسترسی «${revokeTarget.permissionName}» حذف شد.` });
      setShowRevokeDialog(false);
      setRevokeTarget(null);
    } catch (error) {
      showToast({
        type: "error",
        title: "حذف دسترسی ناموفق بود",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  async function handleSeedPermissions() {
    try {
      await seedPermissions.mutateAsync();
      showToast({ type: "success", title: "دسترسی‌ها از مقادیر پیش‌فرض بازنشانی شدند." });
      setShowSeedDialog(false);
    } catch (error) {
      showToast({
        type: "error",
        title: "بازنشانی ناموفق بود",
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  function toggleRole(role: string) {
    setExpandedRole((prev) => (prev === role ? null : role));
  }

  function requestRevoke(role: string, permissionName: string) {
    setRevokeTarget({ role, permissionName });
    setShowRevokeDialog(true);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">نقش‌ها و دسترسی‌ها</h1>
          <p className="mt-1 text-sm text-slate-500">
            مدیریت نقش‌های سیستم و سطوح دسترسی هر نقش
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => permissionsMap.refetch()}
            disabled={permissionsMap.isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${permissionsMap.isFetching ? "animate-spin" : ""}`}
            />
            بروزرسانی
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowSeedDialog(true)}
          >
            <RotateCcw className="h-4 w-4" />
            بازنشانی پیش‌فرض
          </Button>
          <Button
            type="button"
            onClick={() => {
              setFormRole("admin");
              setFormResource("");
              setFormAction("");
              setShowAddDialog(true);
            }}
          >
            <Plus className="h-4 w-4" />
            افزودن دسترسی
          </Button>
        </div>
      </div>

      {/* Error State */}
      {permissionsMap.isError ? (
        <ErrorState
          title="بارگذاری نقش‌ها انجام نشد"
          description={errorMessage}
          actions={
            <Button type="button" variant="outline" onClick={() => permissionsMap.refetch()}>
              تلاش مجدد
            </Button>
          }
        />
      ) : null}

      {/* Loading State */}
      {!permissionsMap.isError && permissionsMap.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <Skeleton className="mb-4 h-8 w-48 rounded-xl" />
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="mt-2 h-6 w-3/4 rounded-lg" />
            </div>
          ))}
        </div>
      ) : null}

      {/* Roles List */}
      {!permissionsMap.isError && !permissionsMap.isLoading ? (
        <div className="space-y-3">
          {roles.map((role) => {
            const meta = ROLE_META[role] ?? {
              label: translateRole(role),
              icon: Shield,
              color: "text-slate-600",
              bgClass: "bg-slate-100",
            };
            const Icon = meta.icon;
            const perms = permissionMap[role] ?? [];
            const isExpanded = expandedRole === role;
            const isSuperAdmin = role === "super_admin";
            const isDeprecated = meta.deprecated === true;
            const permCount = perms.length;

            return (
              <motion.div
                key={role}
                layout
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Role Header */}
                <button
                  type="button"
                  onClick={() => toggleRole(role)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-right transition hover:bg-slate-50/50"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.bgClass}`}
                  >
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">
                        {meta.label ?? translateRole(role)}
                      </span>
                      <span className="font-mono text-xs text-slate-400">({role})</span>
                      {isDeprecated ? (
                        <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          منسوخ
                        </span>
                      ) : null}
                      {isSuperAdmin ? (
                        <span className="rounded-lg bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                          دسترسی کامل
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {permCount} دسترسی
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Permission badges preview */}
                    {!isExpanded && perms.length > 0 && perms[0] !== "*" ? (
                      <div className="hidden items-center gap-1 sm:flex">
                        {perms.slice(0, 3).map((p) => (
                          <span
                            key={p}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600"
                          >
                            {p}
                          </span>
                        ))}
                        {perms.length > 3 ? (
                          <span className="text-xs text-slate-400">
                            +{perms.length - 3}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {!isExpanded && isSuperAdmin ? (
                      <span className="hidden rounded-lg bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-600 sm:inline-flex">
                        *
                      </span>
                    ) : null}
                    <ChevronDown
                      className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {/* Expanded Permissions */}
                <AnimatePresence>
                  {isExpanded ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 px-5 py-4">
                        {isDeprecated ? (
                          <div className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                            <ShieldAlert className="h-4 w-4 shrink-0" />
                            این نقش منسوخ شده و قابل اختصاص به کاربران جدید نیست.
                          </div>
                        ) : null}

                        {perms.length === 0 ? (
                          <div className="py-4 text-center">
                            <p className="text-sm text-slate-500">
                              هیچ دسترسی تعریف‌شده‌ای برای این نقش وجود ندارد.
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {perms.map((perm) => (
                              <div
                                key={perm}
                                className="group flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm transition hover:border-slate-300"
                              >
                                <span className="font-mono text-xs font-semibold text-slate-700">
                                  {perm}
                                </span>
                                <span className="text-xs text-slate-400">
                                  — {translatePermissionName(perm)}
                                </span>
                                {/* Cannot revoke from super_admin (wildcard) */}
                                {!isSuperAdmin && perm !== "*" ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      requestRevoke(role, perm);
                                    }}
                                    disabled={revokePermission.isPending}
                                    className="mr-1 flex h-5 w-5 items-center justify-center rounded-lg text-slate-400 opacity-0 transition hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                                    title="حذف دسترسی"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Quick add permission for this role */}
                        {!isSuperAdmin && !isDeprecated ? (
                          <div className="mt-4 flex items-center gap-2">
                            <QuickAddPermission
                              role={role}
                              disabled={grantPermission.isPending}
                              onGrant={async (permissionName, resource, action) => {
                                try {
                                  await grantPermission.mutateAsync({
                                    role,
                                    permissionName,
                                    resource,
                                    action,
                                  });
                                  showToast({
                                    type: "success",
                                    title: `دسترسی «${permissionName}» اضافه شد.`,
                                  });
                                } catch (error) {
                                  showToast({
                                    type: "error",
                                    title: "افزودن دسترسی ناموفق بود",
                                    description:
                                      error instanceof Error ? error.message : undefined,
                                  });
                                }
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {roles.length === 0 ? (
            <EmptyState
              title="نقشی یافت نشد"
              description="هیچ نقشی در سیستم تعریف نشده است."
              actions={
                <Button type="button" onClick={() => setShowSeedDialog(true)}>
                  بازنشانی پیش‌فرض
                </Button>
              }
            />
          ) : null}
        </div>
      ) : null}

      {/* ── Add Permission Dialog ─────────────────────────────────────── */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        titleId="add-permission-title"
        descriptionId="add-permission-desc"
        className="max-w-lg"
      >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="add-permission-title" className="text-lg font-black text-slate-900">افزودن دسترسی جدید</h2>
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
                aria-label="بستن"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p id="add-permission-desc" className="sr-only">
              فرم افزودن دسترسی جدید به نقش انتخابی
            </p>

            {/* Role selector */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">نقش</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                {ACTIVE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_META[r]?.label ?? translateRole(r)} ({r})
                  </option>
                ))}
              </select>
            </div>

            {/* Resource */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">منبع (Resource)</label>
              <Input
                value={formResource}
                onChange={(e) => setFormResource(e.target.value)}
                placeholder="مثال: products"
                list="resources-list"
              />
              <datalist id="resources-list">
                {KNOWN_RESOURCES.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            {/* Action */}
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">عمل (Action)</label>
              <Input
                value={formAction}
                onChange={(e) => setFormAction(e.target.value)}
                placeholder="مثال: create"
                list="actions-list"
              />
              <datalist id="actions-list">
                {KNOWN_ACTIONS.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>

            {/* Preview */}
            {formResource && formAction ? (
              <div className="mb-5 rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">دسترسی ایجاد خواهد شد:</p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                  {formResource.trim()}.{formAction.trim()}
                </p>
                <p className="text-xs text-slate-500">
                  {translatePermissionName(`${formResource.trim()}.${formAction.trim()}`)}
                </p>
              </div>
            ) : null}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={grantPermission.isPending}
              >
                لغو
              </Button>
              <Button
                type="button"
                onClick={handleGrantPermission}
                disabled={grantPermission.isPending || !formResource.trim() || !formAction.trim()}
              >
                {grantPermission.isPending ? "در حال افزودن..." : "افزودن دسترسی"}
              </Button>
            </div>
      </Dialog>

      {/* ── Revoke Permission Dialog ──────────────────────────────────── */}
      <ConfirmDialog
        open={showRevokeDialog}
        title="حذف دسترسی"
        description={
          revokeTarget
            ? `آیا از حذف دسترسی «${revokeTarget.permissionName}» از نقش «${translateRole(revokeTarget.role)}» مطمئن هستید؟`
            : ""
        }
        confirmText="حذف دسترسی"
        destructive
        loading={revokePermission.isPending}
        onConfirm={handleRevokePermission}
        onCancel={() => {
          setShowRevokeDialog(false);
          setRevokeTarget(null);
        }}
      />

      {/* ── Seed (Reset) Dialog ───────────────────────────────────────── */}
      <ConfirmDialog
        open={showSeedDialog}
        title="بازنشانی دسترسی‌ها به پیش‌فرض"
        description="تمام دسترسی‌های پویا از پایگاه داده حذف و مقادیر پیش‌فرض دوباره ثبت خواهند شد. این عمل غیرقابل بازگشت است."
        confirmText="بازنشانی"
        destructive
        loading={seedPermissions.isPending}
        onConfirm={handleSeedPermissions}
        onCancel={() => setShowSeedDialog(false)}
      />
    </div>
  );
}

// ── Quick Add Permission Inline Component ────────────────────────────────

function QuickAddPermission({
  role,
  disabled,
  onGrant,
}: {
  role: string;
  disabled: boolean;
  onGrant: (permissionName: string, resource: string, action: string) => Promise<void>;
}) {
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleAdd() {
    if (!resource.trim() || !action.trim()) return;
    setIsPending(true);
    try {
      await onGrant(`${resource.trim()}.${action.trim()}`, resource.trim(), action.trim());
      setResource("");
      setAction("");
    } finally {
      setIsPending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && resource.trim() && action.trim()) {
      void handleAdd();
    }
  }

  return (
    <>
      <Input
        value={resource}
        onChange={(e) => setResource(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="منبع (مثلاً products)"
        className="h-9 text-xs"
        disabled={disabled || isPending}
        list={`qr-${role}`}
      />
      <datalist id={`qr-${role}`}>
        {KNOWN_RESOURCES.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <span className="text-slate-400">.</span>
      <Input
        value={action}
        onChange={(e) => setAction(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="عمل (مثلاً create)"
        className="h-9 w-24 text-xs"
        disabled={disabled || isPending}
        list={`qa-${role}`}
      />
      <datalist id={`qa-${role}`}>
        {KNOWN_ACTIONS.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <Button
        type="button"
        variant="outline"
        onClick={handleAdd}
        disabled={disabled || isPending || !resource.trim() || !action.trim()}
        className="h-9 gap-1 px-3 text-xs"
      >
        <Plus className="h-3.5 w-3.5" />
        {isPending ? "..." : "افزودن"}
      </Button>
    </>
  );
}
