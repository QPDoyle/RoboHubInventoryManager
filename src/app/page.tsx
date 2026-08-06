"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Item } from "@/lib/database.types";
import { Package, AlertTriangle, ScanLine, Printer } from "lucide-react";
import dynamic from "next/dynamic";

const ScannerModal = dynamic(() => import("@/components/ScannerModal"), { ssr: false });

const CATEGORIES = ["All", "Electronics", "Mechanical", "Consumables", "Tools", "Other"];

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("items")
      .select("*")
      .order("name")
      .then(({ data }: { data: Item[] | null }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {scanning && <ScannerModal items={items} onClose={() => setScanning(false)} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <div className="flex items-center gap-2">
          <a
            href="/items/print-all"
            target="_blank"
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50"
          >
            <Printer size={16} />
            Print QR Codes
          </a>
          <button
            onClick={() => setScanning(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm"
          >
            <ScanLine size={18} />
            Scan Item
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-400 mb-4">{filtered.length} items</p>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading inventory...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="mx-auto mb-3 opacity-40" size={40} />
          <p>No items found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Available</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => {
                const isLow = item.available_quantity === 0;
                const isWarning = item.available_quantity > 0 && item.available_quantity < 3;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.category ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{item.location ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${isLow ? "text-red-600" : isWarning ? "text-yellow-600" : "text-green-600"}`}
                      >
                        {item.available_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{item.total_quantity}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isLow && <AlertTriangle size={14} className="text-red-500" />}
                        <a
                          href={`/items/${item.id}`}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Details
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
