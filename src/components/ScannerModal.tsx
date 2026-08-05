"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Item } from "@/lib/database.types";

interface Props {
  items: Item[];
  onClose: () => void;
}

export default function ScannerModal({ items, onClose }: Props) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  function cleanup() {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
  }

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      const { Html5QrcodeScanner } = await import("html5-qrcode");
      if (!mounted) return;

      scannerRef.current = new Html5QrcodeScanner(
        "main-qr-reader",
        { fps: 10, qrbox: { width: 240, height: 240 } },
        false
      );

      scannerRef.current.render(
        (decoded: string) => {
          // Handle full URL (e.g. https://yourapp.com/checkout?item=abc)
          try {
            const url = new URL(decoded);
            const itemId = url.searchParams.get("item");
            if (itemId) {
              cleanup();
              onClose();
              router.push(`/checkout?item=${itemId}`);
              return;
            }
          } catch {}

          // Handle barcode string matching an item
          const byBarcode = items.find((i) => i.barcode === decoded);
          if (byBarcode) {
            cleanup();
            onClose();
            router.push(`/checkout?item=${byBarcode.id}`);
            return;
          }

          // Handle raw item ID
          const byId = items.find((i) => i.id === decoded);
          if (byId) {
            cleanup();
            onClose();
            router.push(`/checkout?item=${byId.id}`);
          }
        },
        () => {}
      );
    }

    startScanner();
    return () => {
      mounted = false;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    cleanup();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-lg">Scan Item</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Point your camera at an item&apos;s QR code</p>
        <div id="main-qr-reader" />
      </div>
    </div>
  );
}
