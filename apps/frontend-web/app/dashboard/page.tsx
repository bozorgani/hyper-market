"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHydrateAuth } from "@/lib/auth/use-hydrate-auth";
import { useAuthStore } from "@/lib/auth/store";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);

  useHydrateAuth();

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login");
    }
  }, [hydrated, router, user]);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <p className="text-slate-300">Loading session...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Hyper Market workspace</h1>
            <p className="mt-2 text-sm text-slate-300">Authenticated user session summary.</p>
          </div>
          <button onClick={handleLogout} className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10">
            Logout
          </button>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">User ID</p>
            <p className="mt-2 break-all font-mono text-sm text-white">{user.id}</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Role</p>
            <p className="mt-2 text-2xl font-bold capitalize text-white">{user.role.replace("_", " ")}</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
            <p className="text-sm text-slate-400">Device</p>
            <p className="mt-2 break-all font-mono text-sm text-white">{user.deviceId || "Not available"}</p>
          </article>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">Next steps</h2>
          <p className="mt-2 text-slate-300">Marketplace modules can be connected here when backend business APIs are available.</p>
          <Link href="/" className="mt-4 inline-flex rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400">
            Back home
          </Link>
        </section>
      </div>
    </main>
  );
}
