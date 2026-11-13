"use client";

import type { ReactNode } from "react";
import { GhostButton } from "@/components/ui";

/**
 * Compact square icon button used in card headers (refresh, reset, …).
 * Matches the preview refresh button so all header actions look identical.
 */
export default function IconButton({
  icon,
  label,
  onClick,
  className = "",
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <GhostButton
      type="button"
      size="sm"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`!px-2 !py-1 ${className}`}
    >
      {icon}
    </GhostButton>
  );
}
