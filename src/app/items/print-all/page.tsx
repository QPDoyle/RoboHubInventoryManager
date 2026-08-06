"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Item } from "@/lib/database.types";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";

export default function PrintAllPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("items")
      .select("*")
      .order("name")
      .then(({ data }: { data: Item[] | null }) => setItems(data ?? []));
  }, []);

  return (
    <>
      {/* Screen-only controls */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">Print All QR Codes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} items · 5 per row · fits ~30 labels per page
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      {/* Label grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 print:grid-cols-5 print:gap-0">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col items-center text-center p-2 border border-gray-200 rounded print:rounded-none print:border-gray-400 break-inside-avoid"
          >
            {origin && (
              <QRCodeSVG
                value={`${origin}/checkout?item=${item.id}`}
                size={88}
                level="M"
                className="shrink-0"
              />
            )}
            <p className="text-xs font-semibold mt-1.5 leading-tight line-clamp-2">{item.name}</p>
            {item.location && (
              <p className="text-xs text-gray-400 leading-tight mt-0.5">{item.location}</p>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          /* Hide the app nav and reset main padding */
          nav { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }

          /* Tight page margins to fit more labels */
          @page { size: letter; margin: 0.35in; }

          body { margin: 0; }
        }
      `}</style>
    </>
  );
}
