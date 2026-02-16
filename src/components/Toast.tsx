"use client";

import { useEffect } from "react";
import { Toast as ToastType } from "../types";

interface ToastProps {
  toast: ToastType;
  onClose: (id: string) => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const bgColor =
    toast.type === "success"
      ? "bg-green-600"
      : toast.type === "error"
      ? "bg-red-600"
      : "bg-blue-600";

  const icon =
    toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ";

  return (
    <div
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-in`}
    >
      <span className="text-xl font-bold">{icon}</span>
      <span className="flex-grow">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className="text-white/80 hover:text-white text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
}
