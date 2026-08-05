import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoboHub Inventory",
  description: "Robotics camp inventory management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <a href="/" className="font-bold text-lg text-blue-600">RoboHub Inventory</a>
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Inventory</a>
          <a href="/checkout" className="text-sm text-gray-600 hover:text-gray-900">Check Out / In</a>
          <a href="/items/new" className="ml-auto text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700">
            + Add Item
          </a>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
