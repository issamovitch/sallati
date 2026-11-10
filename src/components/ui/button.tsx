"use client";

import type { ButtonHTMLAttributes } from "react";

type Size = "md" | "sm";

const PADDING: Record<Size, string> = {
  md: "px-4 py-2",
  sm: "px-3 py-1.5",
};

export function Button({
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: Size }) {
  return (
    <button
      {...props}
      className={`btn-brand rounded-lg text-sm font-medium ${PADDING[size]} ${className}`}
    />
  );
}

export function GhostButton({
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: Size }) {
  return (
    <button
      {...props}
      className={`rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 ${PADDING[size]} ${className}`}
    />
  );
}

export function LinkButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`text-xs text-[#1781ae] hover:underline ${className}`}
    />
  );
}

export function DangerButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`text-xs text-red-500 hover:text-red-700 ${className}`}
    />
  );
}
