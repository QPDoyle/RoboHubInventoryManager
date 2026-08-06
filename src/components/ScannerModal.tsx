"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Camera, ScanLine } from "lucide-react";
import type { Item } from "@/lib/database.types";

type ScanState = "prompt" | "scanning" | "error";

interface Props {
  items: Item[];
  onClose: () => void;
}

export default function ScannerModal({ items, onClose }: Props) {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>("prompt");
  const [errorMsg, setErrorMsg] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // If permission already granted, skip the explanation prompt
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((r) => { if (r.state === "granted") setScanState("scanning"); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (scanState !== "scanning") return;
    let mounted = true;

    async function startScanner() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!mounted) return;

      const scanner = new Html5Qrcode("main-qr-reader");
      scannerRef.current = scanner;

      const config = { fps: 10, qrbox: { width: 240, height: 240 } };

      function onScan(decoded: string) {
        const navigate = (itemId: string) => {
          scanner.stop().catch(() => {});
          onClose();
          router.push(`/checkout?item=${itemId}`);
        };
        // Full URL encoded in QR
        try {
          const url = new URL(decoded);
          const itemId = url.searchParams.get("item");
          if (itemId) { navigate(itemId); return; }
        } catch {}
        // Barcode field match
        const byBarcode = itemsRef.current.find((i) => i.barcode === decoded);
        if (byBarcode) { navigate(byBarcode.id); return; }
        // Raw item ID
        const byId = itemsRef.current.find((i) => i.id === decoded);
        if (byId) navigate(byId.id);
      }

      try {
        // Try back camera first (phones/tablets)
        await scanner.start({ facingMode: "environment" }, config, onScan, () => {});
      } catch {
        try {
          // Fall back to any available camera (desktops)
          await scanner.start({ facingMode: "user" }, config, onScan, () => {});
        } catch (err) {
          if (mounted) {
            setErrorMsg("Could not open camera. Please check that camera access is allowed in your browser settings.");
            setScanState("error");
          }
          console.error("Scanner failed:", err);
        }
      }
    }

    startScanner();
    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanState]);

  function handleClose() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="font-semibold text-lg">Scan Item</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 p-1 -mr-1">
            <X size={20} />
          </button>
        </div>

        {scanState === "prompt" && (
          <div className="px-5 pb-7 pt-2 flex flex-col items-center text-center gap-5">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
              <Camera size={38} className="text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Camera access needed</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                We&apos;ll use your <strong className="text-gray-700">back camera</strong> to
                scan QR codes on items. Your browser will ask for permission — you only need
                to allow it once.
              </p>
            </div>
            <button
              onClick={() => setScanState("scanning")}
              className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-2"
            >
              <ScanLine size={18} />
              Open Camera
            </button>
            <button onClick={handleClose} className="text-sm text-gray-400 hover:text-gray-600 -mt-2">
              Cancel
            </button>
          </div>
        )}

        {scanState === "scanning" && (
          <div className="px-4 pb-5 pt-1">
            <p className="text-sm text-gray-400 text-center mb-3">Point at an item&apos;s QR code</p>
            <div id="main-qr-reader" className="rounded-lg overflow-hidden" />
          </div>
        )}

        {scanState === "error" && (
          <div className="px-5 pb-7 pt-4 flex flex-col items-center text-center gap-4">
            <p className="text-sm text-red-600">{errorMsg}</p>
            <button
              onClick={() => setScanState("scanning")}
              className="text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
