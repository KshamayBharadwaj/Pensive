"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  children, onClick, type, disabled, variant = "primary", className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
}) {
  const base = "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-700",
    secondary: "bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-50",
    ghost: "bg-transparent border-transparent text-zinc-700 hover:bg-zinc-100",
    danger: "bg-white text-red-700 border-zinc-300 hover:bg-red-50",
  }[variant];
  return (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} className={cn(base, styles, className)}>
      {children}
    </button>
  );
}
