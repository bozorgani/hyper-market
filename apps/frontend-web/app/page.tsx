import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-5xl rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur md:p-12">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-blue-300">
            Hyper Market
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
            Secure commerce operations dashboard
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            A clean SaaS interface connected to the existing backend authentication APIs.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="rounded-xl bg-blue-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-400"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-white/15 px-6 py-3 text-center font-semibold text-white transition hover:bg-white/10"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
