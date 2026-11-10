// packages/shared/src/content/portion-cluster.ts

/** Trims user input; returns null for blank so the DB check constraint is never violated. */
export function normalizePortionCluster(raw: string): string | null {
  const value = raw.trim();
  return value === "" ? null : value;
}

/** Distinct, non-empty cluster names, sorted for stable chip order. */
export function uniqueClusters(rows: readonly { portion_cluster: string | null }[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = row.portion_cluster?.trim();
    if (value) seen.add(value);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}