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

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-100">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-base font-medium text-zinc-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
