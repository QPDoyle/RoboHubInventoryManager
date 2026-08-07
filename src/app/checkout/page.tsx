"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Item, Checkout } from "@/lib/database.types";
import { ScanLine, CheckCircle, RotateCcw, ArrowLeft } from "lucide-react";

type Mode = "checkout" | "return";

function CheckoutForm() {
  const searchParams = useSearchParams();
  const scannedItemId = searchParams.get("item");

  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [mode, setMode] = useState<Mode>("checkout");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerInstance = useRef<any>(null);

  // Load all items and pre-select if item param is present
  useEffect(() => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("items")
      .select("*")
      .order("name")
      .then(({ data }: { data: Item[] | null }) => {
        const all = data ?? [];
        setItems(all);
        if (scannedItemId) {
          const found = all.find((i) => i.id === scannedItemId);
          if (found) setSelectedItem(found);
        }
      });
  }, [scannedItemId]);

  async function startScanner() {
    const { Html5QrcodeScanner } = await import("html5-qrcode");
    if (scannerInstance.current) return;
    setScanning(true);
    scannerInstance.current = new Html5QrcodeScanner(
      "checkout-qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scannerInstance.current.render(
      (decoded: string) => {
        // Try URL
        try {
          const url = new URL(decoded);
          const itemId = url.searchParams.get("item");
          if (itemId) {
            const found = items.find((i) => i.id === itemId);
            if (found) { setSelectedItem(found); stopScanner(); return; }
          }
        } catch {}
        // Try barcode
        const byBarcode = items.find((i) => i.barcode === decoded);
        if (byBarcode) { setSelectedItem(byBarcode); stopScanner(); return; }
      },
      () => {}
    );
  }

  function stopScanner() {
    if (scannerInstance.current) {
      scannerInstance.current.clear();
      scannerInstance.current = null;
    }
    setScanning(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    if (mode === "checkout") {
      const { error } = await db.from("checkouts").insert({
        item_id: selectedItem.id,
        checked_out_by: name,
        quantity,
        due_date: dueDate || null,
        notes: notes || null,
        returned_at: null,
      });
      if (error) {
        alert("Error: " + (error as { message: string }).message);
        setSaving(false);
        return;
      }
      await db
        .from("items")
        .update({ available_quantity: selectedItem.available_quantity - quantity })
        .eq("id", selectedItem.id);
    } else {
      const { data: active } = await db
        .from("checkouts")
        .select("*")
        .eq("item_id", selectedItem.id)
        .eq("checked_out_by", name)
        .is("returned_at", null)
        .limit(1);

      const activeCheckouts = active as Checkout[] | null;
      if (!activeCheckouts || activeCheckouts.length === 0) {
        alert(`No active checkout found for "${name}" on this item.`);
        setSaving(false);
        return;
      }
      const checkout = activeCheckouts[0];
      const returning = Math.min(returnQuantity, checkout.quantity);
      const remaining = checkout.quantity - returning;

      if (remaining <= 0) {
        // Full return — mark the record as returned
        await db.from("checkouts").update({ returned_at: new Date().toISOString() }).eq("id", checkout.id);
      } else {
        // Partial return — reduce the checked-out quantity, leave record open
        await db.from("checkouts").update({ quantity: remaining }).eq("id", checkout.id);
      }
      await db
        .from("items")
        .update({ available_quantity: selectedItem.available_quantity + returning })
        .eq("id", selectedItem.id);
    }

    setSuccess(true);
    setSaving(false);
  }

  function reset() {
    setSelectedItem(scannedItemId ? selectedItem : null);
    setName("");
    setQuantity(1);
    setReturnQuantity(1);
    setDueDate("");
    setNotes("");
    setSuccess(false);
    setMode("checkout");
    // Refresh available counts
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("items")
      .select("*")
      .order("name")
      .then(({ data }: { data: Item[] | null }) => {
        const all = data ?? [];
        setItems(all);
        if (scannedItemId) {
          const found = all.find((i) => i.id === scannedItemId);
          if (found) setSelectedItem(found);
        }
      });
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
        <h2 className="text-xl font-semibold mb-2">
          {mode === "checkout" ? "Checked out!" : "Returned!"}
        </h2>
        <p className="text-gray-500 mb-6">
          {selectedItem?.name} · qty {mode === "checkout" ? quantity : returnQuantity} · {name}
        </p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Done / Another
        </button>
      </div>
    );
  }

  // ── Scan-first flow (arrived via QR code) ──────────────────────────────────
  if (scannedItemId) {
    if (!selectedItem) {
      return <div className="text-center py-16 text-gray-400">Loading item...</div>;
    }

    const isOut = selectedItem.available_quantity === 0;

    return (
      <div className="max-w-sm mx-auto">
        <a href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft size={14} /> Inventory
        </a>

        {/* Item card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 text-center">
          <h1 className="text-xl font-bold mb-1">{selectedItem.name}</h1>
          {selectedItem.description && (
            <p className="text-sm text-gray-500 mb-3">{selectedItem.description}</p>
          )}
          <span
            className={`inline-block text-sm font-semibold px-3 py-1 rounded-full ${
              isOut
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {isOut ? "None available" : `${selectedItem.available_quantity} of ${selectedItem.total_quantity} available`}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          {/* Checkout / Return toggle */}
          <div className="flex gap-2">
            {(["checkout", "return"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m === "checkout" ? <ScanLine size={14} /> : <RotateCcw size={14} />}
                {m === "checkout" ? "Check Out" : "Return"}
              </button>
            ))}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="First Last"
            />
          </div>

          {/* Checkout fields */}
          {mode === "checkout" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={selectedItem.available_quantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>
              {selectedItem.available_quantity < quantity && (
                <p className="text-sm text-red-600">
                  Only {selectedItem.available_quantity} available.
                </p>
              )}
            </>
          )}

          {/* Return quantity */}
          {mode === "return" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How many are you returning?
              </label>
              <input
                required
                type="number"
                min={1}
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={
              saving ||
              (mode === "checkout" && selectedItem.available_quantity < quantity) ||
              (mode === "checkout" && isOut)
            }
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : mode === "checkout"
              ? "Check Out"
              : "Return Item"}
          </button>
        </form>
      </div>
    );
  }

  // ── Manual flow (no QR scan) ───────────────────────────────────────────────
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">Check Out / Return</h1>

      <div className="flex gap-2 mb-6">
        {(["checkout", "return"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium ${
              mode === m
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {m === "checkout" ? <ScanLine size={14} /> : <RotateCcw size={14} />}
            {m === "checkout" ? "Check Out" : "Return"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item *</label>
          <div className="flex gap-2">
            <select
              required
              value={selectedItem?.id ?? ""}
              onChange={(e) => {
                const found = items.find((i) => i.id === e.target.value) ?? null;
                setSelectedItem(found);
                setQuantity(1);
              }}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— select an item —</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.available_quantity} available)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={scanning ? stopScanner : startScanner}
              className="flex items-center gap-1.5 border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50"
            >
              <ScanLine size={14} />
              {scanning ? "Stop" : "Scan"}
            </button>
          </div>
          <div id="checkout-qr-reader" className={scanning ? "mt-3" : "hidden"} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="First Last"
          />
        </div>

        {mode === "checkout" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={selectedItem?.available_quantity ?? 999}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>
            {selectedItem && selectedItem.available_quantity < quantity && (
              <p className="text-sm text-red-600">
                Only {selectedItem.available_quantity} available — reduce quantity.
              </p>
            )}
          </>
        )}

        {mode === "return" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How many are you returning?
            </label>
            <input
              required
              type="number"
              min={1}
              value={returnQuantity}
              onChange={(e) => setReturnQuantity(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={
            saving ||
            (mode === "checkout" && !!selectedItem && selectedItem.available_quantity < quantity)
          }
          className="w-full bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : mode === "checkout" ? "Check Out" : "Return Item"}
        </button>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-gray-400">Loading...</div>}>
      <CheckoutForm />
    </Suspense>
  );
}
