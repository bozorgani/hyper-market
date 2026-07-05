export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await request.json()
      : await request.text();

    console.warn("[CSP_REPORT]", JSON.stringify(payload).slice(0, 4000));
  } catch (error) {
    console.warn("[CSP_REPORT_PARSE_FAILED]", error instanceof Error ? error.message : String(error));
  }

  return new Response(null, { status: 204 });
}

export async function GET() {
  return new Response(null, { status: 204 });
}
