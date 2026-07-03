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

export function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-700 mb-1">{label}</span>
      {children}
      {error ? <span className="block text-sm text-red-700 mt-1" role="alert">{error}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm",
        "placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none",
        props.className
      )}
    />
  );
}
