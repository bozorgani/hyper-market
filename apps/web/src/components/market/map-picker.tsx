"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { X, Navigation, MapPin, Check } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [35.6892, 51.389];
const DEFAULT_ZOOM = 15;

const greenIcon = L.divIcon({
  html: `<div style="width:32px;height:32px;position:relative;">
    <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;background:#00a049;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
  </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface MapPickerProps {
  initialLocation: { lat: number; lng: number } | null;
  onClose: () => void;
  onConfirm: (location: { lat: number; lng: number }, address: string) => void;
}

export function MapPicker({ initialLocation, onClose, onConfirm }: MapPickerProps) {
  const [position, setPosition] = useState<[number, number]>(initialLocation ? [initialLocation.lat, initialLocation.lng] : DEFAULT_CENTER);
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fa`);
      const data = await res.json();
      setAddress(data.display_name ?? "آدرس نامشخص");
    } catch {
      setAddress("خطا در دریافت آدرس");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: position,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    const marker = L.marker(position, { icon: greenIcon, draggable: true }).addTo(map);

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      const newPos: [number, number] = [pos.lat, pos.lng];
      setPosition(newPos);
      void reverseGeocode(pos.lat, pos.lng);
    });

    map.on("moveend", () => {
      const center = map.getCenter();
      marker.setLatLng(center);
      const newPos: [number, number] = [center.lat, center.lng];
      setPosition(newPos);
      void reverseGeocode(center.lat, center.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    setMapReady(true);
    void reverseGeocode(position[0], position[1]);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        mapInstanceRef.current?.setView(newPos, DEFAULT_ZOOM);
        markerRef.current?.setLatLng(newPos);
        void reverseGeocode(newPos[0], newPos[1]);
      },
      () => {},
      { enableHighAccuracy: true }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col bg-white"
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 h-14 bg-white shrink-0">
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5">
          <X size={20} className="text-slate-700" />
        </button>
        <h2 className="text-sm font-bold text-slate-800">انتخاب آدرس</h2>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1" />

      {/* GPS button */}
      <button
        onClick={handleGPS}
        className="absolute left-4 top-20 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-float text-emerald-600 hover:bg-emerald-50 transition-colors z-[210]"
      >
        <Navigation size={20} />
      </button>

      {/* Bottom sheet */}
      <div className="shrink-0 border-t bg-white px-4 pt-4 pb-6 pb-safe">
        <div className="flex items-start gap-3 mb-4">
          <MapPin size={18} className="mt-0.5 text-emerald-500 shrink-0" />
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
            ) : (
              <p className="text-sm font-semibold text-slate-700 leading-6">{address || "در حال بارگذاری آدرس..."}</p>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              {position[0].toFixed(4)}، {position[1].toFixed(4)}
            </p>
          </div>
        </div>
        <button
          onClick={() => onConfirm({ lat: position[0], lng: position[1] }, address)}
          disabled={!address || loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-green hover:bg-emerald-600 transition-colors disabled:opacity-40"
        >
          <Check size={18} />
          تایید آدرس
        </button>
      </div>
    </motion.div>
  );
}