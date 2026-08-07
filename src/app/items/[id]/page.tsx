"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Item, Checkout } from "@/lib/database.types";
import { ArrowLeft, CheckCircle, Clock, Printer, QrCode, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type DeleteMode = "quantity" | "all";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("quantity");
  const [deleteQty, setDeleteQty] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;

    if (deleteMode === "all" && deleteConfirm !== "DELETE") {
      alert('Type DELETE (all caps) to confirm.');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;
    setDeleting(true);

    if (deleteMode === "quantity") {
      if (deleteQty > item.total_quantity) {
        alert(`Can't remove ${deleteQty} — only ${item.total_quantity} exist in total.`);
        setDeleting(false);
        return;
      }
      await db.from("items").update({
        total_quantity: item.total_quantity - deleteQty,
        available_quantity: Math.max(0, item.available_quantity - deleteQty),
      }).eq("id", item.id);

      const { data } = await db.from("items").select("*").eq("id", item.id).single();
      setItem(data as Item);
      setDeleteOpen(false);
      setDeleteQty(1);
    } else {
      await db.from("items").delete().eq("id", item.id);
      router.push("/");
    }

    setDeleting(false);
  }

  if (loading) return <div className="text-gray-400 py-16 text-center">Loading...</div>;
  if (!item) return <div className="text-gray-400 py-16 text-center">Item not found.</div>;

  const activeCheckouts = checkouts.filter((c) => !c.returned_at);
  const history = checkouts.filter((c) => c.returned_at);
  const checkoutUrl = `${origin}/checkout?item=${item.id}`;

  return (
    <div>
      {/* Delete confirmation modal */}
      {deleteOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-1">Delete / Remove Stock</h2>
            <p className="text-sm text-gray-500 mb-5">
              Choose whether to remove a quantity from stock or delete the item entirely.
            </p>

            <form onSubmit={handleDelete} className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                {(["quantity", "all"] as DeleteMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setDeleteMode(m); setDeleteConfirm(""); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      deleteMode === m
                        ? m === "all" ? "bg-red-600 text-white" : "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {m === "quantity" ? "Remove quantity" : "Delete entirely"}
                  </button>
                ))}
              </div>

              {deleteMode === "quantity" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How many to remove from total stock?
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={item.total_quantity}
                    value={deleteQty}
                    onChange={(e) => setDeleteQty(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                  {deleteQty > item.available_quantity && (
                    <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded mt-2 px-3 py-2">
                      {deleteQty - item.available_quantity} of these are currently checked out. Their available count will floor at 0.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {activeCheckouts.length > 0 && (
                    <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mb-3">
                      {activeCheckouts.length} active checkout{activeCheckouts.length > 1 ? "s" : ""} will also be deleted.
                    </p>
                  )}
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <strong>DELETE</strong> to confirm
                  </label>
                  <input
                    required
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    placeholder="DELETE"
                    autoComplete="off"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); setDeleteQty(1); }}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || (deleteMode === "all" && deleteConfirm !== "DELETE")}
                  className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-40"
                >
                  {deleting ? "Deleting..." : deleteMode === "quantity" ? "Remove Stock" : "Delete Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            <QRCodeSVG value={checkoutUrl} size={140} level="M" />
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

      <div className="mb-8">
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

      {/* Danger zone */}
      <div className="border border-red-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-red-700">Delete or remove stock</p>
          <p className="text-xs text-red-400 mt-0.5">Remove a quantity or delete this item entirely</p>
        </div>
        <button
          onClick={() => setDeleteOpen(true)}
          className="flex items-center gap-1.5 bg-red-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-red-700"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}
