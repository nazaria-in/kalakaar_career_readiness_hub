// /components/content/PortionClusterChips.tsx

"use client";

import * as React from "react";

interface PortionClusterChipsProps {
  clusters: string[];
  /** null means "All" (no semester filter). */
  value: string | null;
  onChange: (cluster: string | null) => void;
}

export function PortionClusterChips({ clusters, value, onChange }: PortionClusterChipsProps) {
  if (clusters.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-xs font-medium text-text-muted dark:text-text-muted">
        Select Semester
      </span>
      <div
        className="min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Select semester"
      >
        <div className="flex w-max gap-2">
          <Chip label="All" active={value === null} onClick={() => onChange(null)} />
          {clusters.map((cluster) => (
            <Chip
              key={cluster}
              label={cluster}
              active={value === cluster}
              onClick={() => onChange(cluster)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground"
          : "border border-border bg-card text-text-muted hover:text-text-primary dark:border-border dark:bg-card dark:text-text-muted dark:hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}