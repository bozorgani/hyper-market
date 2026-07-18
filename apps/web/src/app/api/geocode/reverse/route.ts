import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
      return NextResponse.json({ error: "lat and lon parameters are required" }, { status: 400 });
    }

    // Call Nominatim with proper User-Agent and fa language
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=fa`;
    const res = await fetch(nominatimUrl, {
      method: "GET",
      headers: {
        "User-Agent": "HyperMarket/1.0 (contact@hypermarket.example.com)",
      },
    });

    if (!res.ok) {
      throw new Error(`Nominatim responded with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Reverse geocoding proxy failed:", error);
    return NextResponse.json({ error: "Failed to reverse geocode" }, { status: 500 });
  }
}
