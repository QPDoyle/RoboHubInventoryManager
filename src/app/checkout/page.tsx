"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Item, Checkout } from "@/lib/database.types";
import { ScanLine, CheckCircle, RotateCcw } from "lucide-react";

type Mode = "checkout" | "return";

export default function CheckoutPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<Mode>("checkout");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerInstance = useRef<any>(null);

  useEffect(() => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("items").select("*").order("name").then(({ data }: { data: Item[] | null }) => setItems(data ?? []));
  }, []);

  async function startScanner() {
    const { Html5QrcodeScanner } = await import("html5-qrcode");
    if (scannerInstance.current) return;
    setScanning(true);
    scannerInstance.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scannerInstance.current.render(
      (decodedText: string) => {
        const match = items.find((i) => i.barcode === decodedText);
        if (match) {
          setSelectedItem(match);
          stopScanner();
        }
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
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    if (mode === "checkout") {
      const { error: checkoutError } = await db.from("checkouts").insert({
        item_id: selectedItem.id,
        checked_out_by: name,
        quantity,
        due_date: dueDate || null,
        notes: notes || null,
        returned_at: null,
      });
      if (!checkoutError) {
        await db
          .from("items")
          .update({ available_quantity: selectedItem.available_quantity - quantity })
          .eq("id", selectedItem.id);
      }
      if (checkoutError) {
        alert("Error: " + (checkoutError as { message: string }).message);
        setSaving(false);
        return;
      }
    } else {
      const { data: activeCheckouts } = await db
        .from("checkouts")
        .select("*")
        .eq("item_id", selectedItem.id)
        .eq("checked_out_by", name)
        .is("returned_at", null)
        .limit(1);

      const checkouts = activeCheckouts as Checkout[] | null;
      if (!checkouts || checkouts.length === 0) {
        alert(`No active checkout found for "${name}" on this item.`);
        setSaving(false);
        return;
      }

      const checkout = checkouts[0];
      await db
        .from("checkouts")
        .update({ returned_at: new Date().toISOString() })
        .eq("id", checkout.id);
      await db
        .from("items")
        .update({ available_quantity: selectedItem.available_quantity + checkout.quantity })
        .eq("id", selectedItem.id);
    }

    setSuccess(true);
    setSaving(false);
  }

  function reset() {
    setSelectedItem(null);
    setName("");
    setQuantity(1);
    setDueDate("");
    setNotes("");
    setSuccess(false);
    // Refresh items
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("items").select("*").order("name").then(({ data }: { data: Item[] | null }) => setItems(data ?? []));
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
        <h2 className="text-xl font-semibold mb-2">
          {mode === "checkout" ? "Checked out!" : "Returned!"}
        </h2>
        <p className="text-gray-500 mb-6">
          {selectedItem?.name} · qty {quantity} · {name}
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

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">Check Out / Return</h1>

      <div className="flex gap-2 mb-6">
        {(["checkout", "return"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium ${
              mode === m ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
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
          <div id="qr-reader" ref={scannerRef} className={scanning ? "mt-3" : "hidden"} />
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
          </>
        )}

        {selectedItem && mode === "checkout" && selectedItem.available_quantity < quantity && (
          <p className="text-sm text-red-600">
            Only {selectedItem.available_quantity} available — reduce quantity.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || (mode === "checkout" && !!selectedItem && selectedItem.available_quantity < quantity)}
          className="w-full bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : mode === "checkout" ? "Check Out" : "Return Item"}
        </button>
      </form>
    </div>
  );
}
