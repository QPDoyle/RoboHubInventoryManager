"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Item } from "@/lib/database.types";
import { QRCodeSVG } from "qrcode.react";

export default function PrintLabelPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("items")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }: { data: Item | null }) => setItem(data));
  }, [id]);

  if (!item) return <div className="p-8 text-gray-400">Loading...</div>;

  const checkoutUrl = `${origin}/checkout?item=${item.id}`;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {/* Print button — hidden when printing */}
      <button
        onClick={() => window.print()}
        className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-md text-sm print:hidden"
      >
        Print
      </button>

      {/* Label — designed to fit a standard label or index card */}
      <div className="border-2 border-black rounded-lg p-6 w-64 flex flex-col items-center gap-4 print:border-0 print:shadow-none">
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">
            RoboHub Inventory
          </p>
          <h1 className="text-lg font-bold leading-tight">{item.name}</h1>
          {item.location && (
            <p className="text-sm text-gray-500 mt-1">{item.location}</p>
          )}
        </div>

        {origin && (
          <QRCodeSVG value={checkoutUrl} size={160} level="M" />
        )}

        <p className="text-xs text-gray-400 text-center">
          Scan to check out or return this item
        </p>
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          button { display: none; }
        }
      `}</style>
    </div>
  );
}
