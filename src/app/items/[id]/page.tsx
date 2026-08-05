"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Item, Checkout } from "@/lib/database.types";
import { ArrowLeft, CheckCircle, Clock, Printer, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const supabase = createClient();
    Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("items").select("*").eq("id", id).single(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("checkouts")
        .select("*")
        .eq("item_id", id)
        .order("checked_out_at", { ascending: false })
        .limit(20),
    ]).then(([itemRes, checkoutsRes]: [{ data: Item | null }, { data: Checkout[] | null }]) => {
      setItem(itemRes.data);
      setCheckouts(checkoutsRes.data ?? []);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="text-gray-400 py-16 text-center">Loading...</div>;
  if (!item) return <div className="text-gray-400 py-16 text-center">Item not found.</div>;

  const activeCheckouts = checkouts.filter((c) => !c.returned_at);
  const history = checkouts.filter((c) => c.returned_at);
  const checkoutUrl = `${origin}/checkout?item=${item.id}`;

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Item info */}
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{item.name}</h1>
              {item.description && <p className="text-gray-500 mt-1">{item.description}</p>}
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
                {item.category && (
                  <span>Category: <strong className="text-gray-800">{item.category}</strong></span>
                )}
                {item.location && (
                  <span>Location: <strong className="text-gray-800">{item.location}</strong></span>
                )}
                {item.barcode && (
                  <span>Barcode: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{item.barcode}</code></span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">{item.available_quantity}</div>
              <div className="text-xs text-gray-400">of {item.total_quantity} available</div>
            </div>
          </div>
        </div>

        {/* QR code */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 self-start">
            <QrCode size={14} />
            QR Code
          </div>
          {origin && (
            <QRCodeSVG
              value={checkoutUrl}
              size={140}
              level="M"
            />
          )}
          <p className="text-xs text-gray-400 text-center">Scan to check out or return</p>
          <a
            href={`/items/${item.id}/print`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
          >
            <Printer size={12} /> Print label
          </a>
        </div>
      </div>

      {activeCheckouts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Clock size={14} className="text-yellow-500" /> Currently Checked Out
          </h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg divide-y divide-yellow-100">
            {activeCheckouts.map((c) => (
              <div key={c.id} className="px-4 py-3 flex justify-between text-sm">
                <span className="font-medium">{c.checked_out_by}</span>
                <span className="text-gray-500">
                  qty {c.quantity} · since {new Date(c.checked_out_at).toLocaleDateString()}
                  {c.due_date && ` · due ${new Date(c.due_date).toLocaleDateString()}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <CheckCircle size={14} className="text-green-500" /> Checkout History
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No checkout history yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {history.map((c) => (
              <div key={c.id} className="px-4 py-3 flex justify-between text-sm">
                <span className="font-medium">{c.checked_out_by}</span>
                <span className="text-gray-500">
                  qty {c.quantity} · {new Date(c.checked_out_at).toLocaleDateString()} →{" "}
                  {c.returned_at ? new Date(c.returned_at).toLocaleDateString() : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
