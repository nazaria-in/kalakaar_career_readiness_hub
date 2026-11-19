// /components/messages/ParticipantRow.tsx
"use client";

import { UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "mentee" | "mentor" | "associate" | "pm";

interface ParticipantRowProps {
  fullName: string | null;
  role: Role | null;
  canRemove: boolean;
  onRemove: () => void;
}

const ROLE_LABEL: Record<Role, string> = {
  mentee: "Mentee",
  mentor: "Mentor",
  associate: "Associate",
  pm: "Program manager",
};

const ROLE_BADGE_CLASS: Record<Role, string> = {
  mentee: "bg-card-alt text-text-muted   border border-border-strong ",
  mentor: "bg-primary/15 text-primary  ",
  associate: "bg-primary text-primary-foreground  ",
  pm: "bg-primary text-primary-foreground  ",
};

export function ParticipantRow({ fullName, role, canRemove, onRemove }: ParticipantRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-card-alt  transition-colors">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card  border border-border-strong  text-sm font-medium text-text-primary ">
        {(fullName ?? "?").charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary ">
          {fullName ?? "Unnamed member"}
        </p>
        {role && (
          <span className={cn("inline-block mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium", ROLE_BADGE_CLASS[role])}>
            {ROLE_LABEL[role]}
          </span>
        )}
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-full p-1.5 text-destructive  hover:bg-destructive/10 "
          aria-label={`Remove ${fullName ?? "member"}`}
        >
          <UserMinus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}