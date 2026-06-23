"use client";

import React from "react";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center select-none">
      <div className="text-6xl mb-6 animate-pulse">📡</div>
      <h1 className="text-3xl font-bold mb-4 tracking-tight">Tidak Ada Koneksi</h1>
      <p className="text-slate-400 max-w-md mb-8 leading-relaxed">
        j0eeys premiums membutuhkan koneksi internet untuk bekerja. Periksa koneksi internetmu dan coba lagi.
      </p>
      <button
        onClick={handleReload}
        className="px-6 py-3 border border-amber-500 text-amber-500 rounded-lg font-semibold hover:bg-amber-500/10 active:bg-amber-500/20 transition-all duration-200 cursor-pointer shadow-lg shadow-amber-500/5"
      >
        Coba Lagi
      </button>
    </div>
  );
}
