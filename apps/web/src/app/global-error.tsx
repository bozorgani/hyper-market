"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "1rem",
          textAlign: "right",
          margin: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "28rem",
            backgroundColor: "#ffffff",
            borderRadius: "1rem",
            padding: "2rem",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
            خطای غیرمنتظره
          </h2>
          <p style={{ marginTop: "0.75rem", lineHeight: 1.8, color: "#475569" }}>
            مشکلی در بارگذاری برنامه رخ داده است. لطفاً صفحه را بارگذاری مجدد کنید.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              height: "2.75rem",
              borderRadius: "0.75rem",
              backgroundColor: "#e11d48",
              color: "#ffffff",
              fontWeight: 700,
              padding: "0 1rem",
              cursor: "pointer",
              border: "none",
            }}
          >
            بارگذاری مجدد
          </button>
        </div>
      </body>
    </html>
  );
}
