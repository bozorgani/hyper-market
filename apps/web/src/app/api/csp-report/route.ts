const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60000; // 1 minute
const MAX_REPORTS_PER_WINDOW = 10; // Max 10 reports per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + WINDOW_MS;
    return true;
  }

  if (entry.count >= MAX_REPORTS_PER_WINDOW) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
             request.headers.get("x-real-ip") || 
             "unknown-ip";

  if (!checkRateLimit(ip)) {
    console.warn(JSON.stringify({
      level: "warn",
      timestamp: new Date().toISOString(),
      message: "CSP Violation Report rate limit exceeded",
      ip,
    }));
    return new Response("Too Many Requests", { status: 429 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await request.json()
      : await request.text();

    const reportData = typeof payload === "object" && payload !== null && "csp-report" in payload
      ? (payload as Record<string, unknown>)["csp-report"]
      : payload;

    console.log(JSON.stringify({
      level: "warn",
      timestamp: new Date().toISOString(),
      message: "CSP Violation Report",
      ip,
      report: reportData,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      message: "CSP Violation Report Parse Failed",
      ip,
      error: error instanceof Error ? error.message : String(error),
    }));
  }

  return new Response(null, { status: 204 });
}

export async function GET() {
  return new Response(null, { status: 204 });
}
