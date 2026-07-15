"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        {/* global-error replaces the root layout, so this same-origin fallback
            stylesheet must be loaded explicitly. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/global-error.css" />
      </head>
      <body className="global-error-page">
        <main className="global-error-card">
          <h2 className="global-error-title">خطای غیرمنتظره</h2>
          <p className="global-error-description">
            مشکلی در بارگذاری برنامه رخ داده است. لطفاً صفحه را بارگذاری مجدد کنید.
          </p>
          <button
            type="button"
            onClick={reset}
            className="global-error-retry"
          >
            بارگذاری مجدد
          </button>
        </main>
      </body>
    </html>
  );
}
