"use client";

import L from "leaflet";
import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Crosshair, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TEHRAN_CENTER: [number, number] = [35.6892, 51.389];

function createCustomIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:40px;height:52px;">
        <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0C8.954 0 0 8.954 0 20c0 15 20 32 20 32s20-17 20-32C40 8.954 31.046 0 20 0z" fill="#e11d48"/>
          <circle cx="20" cy="18" r="8" fill="white"/>
        </svg>
        <div style="position:absolute;top:18px;left:20px;width:12px;height:12px;background:#e11d48;border-radius:50%;transform:translate(-50%,-50%);border:2px solid white;box-shadow:0 0 6px rgba(225,29,72,0.5);"></div>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:20px;height:4px;background:rgba(0,0,0,0.15);border-radius:50%;"></div>
      </div>
    `,
    className: "",
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -52],
  });
}

type MapPickerProps = {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
};

export function MapPicker({
  onLocationSelect,
  onClose,
  initialLat,
  initialLng,
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [selectedAddr, setSelectedAddr] = useState("");
  const [selectedLoc, setSelectedLoc] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const startLat = initialLat ?? TEHRAN_CENTER[0];
  const startLng = initialLng ?? TEHRAN_CENTER[1];

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fa`,
        );
        const data = await res.json();
        if (data.display_name) {
          return data.display_name.split(",").slice(0, 3).join(",").trim();
        }
      } catch {
        /* fallback */
      }
      return `عرض: ${lat.toFixed(4)}، طول: ${lng.toFixed(4)}`;
    },
    [],
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    setIsMapReady(false);
    setMapError("");

    const linkEl = document.createElement("link");
    linkEl.rel = "stylesheet";
    linkEl.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(linkEl);

    // Initialize map (L already imported at top)
    const container = mapRef.current;
    if (!container) return;
    const map = L.map(container, {
      center: [startLat, startLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    const tileLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
      },
    );

    let tileSettled = false;
    const markMapReady = () => {
      if (tileSettled) return;
      tileSettled = true;
      setIsMapReady(true);
    };
    const markMapError = () => {
      setMapError(
        "بارگذاری کاشی‌های نقشه انجام نشد. همچنان می‌توانید موقعیت را انتخاب کنید.",
      );
      markMapReady();
    };

    tileLayer.once("load", markMapReady);
    tileLayer.once("tileerror", markMapError);
    tileLayer.addTo(map);

    const icon = createCustomIcon();
    const marker = L.marker([startLat, startLng], {
      icon,
      draggable: true,
    }).addTo(map);

    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      setSelectedLoc({ lat: pos.lat, lng: pos.lng });
      const addr = await reverseGeocode(pos.lat, pos.lng);
      setSelectedAddr(addr);
    });

    map.on("click", async (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setSelectedLoc({ lat: e.latlng.lat, lng: e.latlng.lng });
      const addr = await reverseGeocode(e.latlng.lat, e.latlng.lng);
      setSelectedAddr(addr);
    });

    L.control.zoom({ position: "bottomleft" }).addTo(map);

    mapInstanceRef.current = map;
    markerRef.current = marker;

    const readyFallbackTimeout = window.setTimeout(markMapReady, 3000);

    // Use a flag so the delayed invalidateSize won't run after unmount
    let cancelled = false;
    const invalidateSizeTimeout = window.setTimeout(() => {
      if (!cancelled && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {
          // Map may have been removed by the time this fires — safe to ignore
        }
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(readyFallbackTimeout);
      window.clearTimeout(invalidateSizeTimeout);
      tileLayer.off("load", markMapReady);
      tileLayer.off("tileerror", markMapError);
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      if (linkEl.parentNode) document.head.removeChild(linkEl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map should only mount once
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstanceRef.current?.setView([latitude, longitude], 16);
        markerRef.current?.setLatLng([latitude, longitude]);
        setSelectedLoc({ lat: latitude, lng: longitude });
        reverseGeocode(latitude, longitude).then((addr) =>
          setSelectedAddr(addr),
        );
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleConfirm = () => {
    if (!selectedLoc) return;
    onLocationSelect(selectedLoc.lat, selectedLoc.lng, selectedAddr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 bg-white shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-rose-600" />
          </div>
          <h2 className="font-black text-sm text-slate-900">
            انتخاب آدرس از نقشه
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* Loading overlay */}
        {!isMapReady ? (
          <div className="absolute inset-0 bg-slate-50 flex items-center justify-center z-[999] pointer-events-none">
            <div className="flex flex-col items-center gap-3 bg-white rounded-2xl p-6 shadow-card">
              <div className="w-8 h-8 border-[3px] border-rose-200 border-t-rose-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500">در حال بارگذاری نقشه...</p>
            </div>
          </div>
        ) : null}

        {mapError ? (
          <div className="absolute right-4 top-4 z-[1000] max-w-xs rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700 shadow-card">
            {mapError}
          </div>
        ) : null}

        {/* Locate me button */}
        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="absolute bottom-4 left-4 z-[1000] w-11 h-11 bg-white rounded-xl shadow-float flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <Crosshair className="w-5 h-5 text-blue-600" />
        </button>
      </div>

      {/* Bottom sheet */}
      <div className="bg-white border-t border-slate-200 px-4 pt-3 pb-6 shrink-0 z-10">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0 mt-0.5">
            <Navigation className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 mb-0.5">آدرس انتخاب شده</p>
            <p className="text-sm font-medium text-slate-900 leading-6">
              {selectedAddr || "نقشه را لمس کنید یا مارکر را جابجا کنید..."}
            </p>
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selectedLoc || !selectedAddr}
          className={cn(
            "w-full h-12 rounded-xl text-sm font-bold transition-all",
            selectedLoc
              ? "bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              : "bg-slate-100 text-slate-400 cursor-not-allowed",
          )}
        >
          تأیید آدرس روی نقشه
          <MapPin className="w-4 h-4 inline mr-1.5" />
        </button>
      </div>
    </div>
  );
}
