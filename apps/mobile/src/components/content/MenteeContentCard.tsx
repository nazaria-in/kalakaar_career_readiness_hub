// /components/content/MenteeContentCard.tsx
import { Pressable, Text, View } from "react-native";
import { Link, type Href } from "expo-router";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileBox,
  RotateCcw,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { CompletionStatus, ContentType, MenteeContentDispatch } from "@repo/shared";

const TYPE_ICON: Record<ContentType, LucideIcon> = {
  assignment: ClipboardList,
  course: BookOpen,
  resource: FileBox,
};

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** Background classes for the pill. */
  bgClassName: string;
  /** Text and icon color classes. Kept separate because Text needs its own color. */
  textClassName: string;
}

const STATUS_META: Record<CompletionStatus, StatusMeta> = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    bgClassName: "bg-primary/10 ",
    textClassName: "text-text-accent ",
  },
  approved_awaiting_completion: {
    label: "Approved",
    icon: CheckCircle2,
    bgClassName: "bg-primary/10 ",
    textClassName: "text-text-accent ",
  },
  pending_review: {
    label: "Waiting on review",
    icon: Clock,
    bgClassName: "bg-card-alt ",
    textClassName: "text-text-muted ",
  },
  needs_revision: {
    label: "Needs revision",
    icon: RotateCcw,
    bgClassName: "bg-destructive/10 ",
    textClassName: "text-destructive ",
  },
  not_started: {
    label: "To do",
    icon: Clock,
    bgClassName: "bg-card-alt ",
    textClassName: "text-text-muted ",
  },
};

interface MenteeContentCardProps {
  dispatch: MenteeContentDispatch;
  href: Href;
}

export function MenteeContentCard({ dispatch, href }: MenteeContentCardProps) {
  const item = dispatch.content_item;
  const Icon = TYPE_ICON[item.content_type];
  const status = STATUS_META[dispatch.completion_status];
  const StatusIcon = status.icon;

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={item.title}
        className="gap-3 rounded-2xl border border-border bg-card p-4 active:opacity-80  "
      >
        <View className="flex-row items-start justify-between gap-2">
          <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent ">
            <Icon size={16} className="text-accent-foreground " />
          </View>
          <View className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${status.bgClassName}`}>
            <StatusIcon size={12} className={status.textClassName} />
            <Text className={`text-[11px] font-medium ${status.textClassName}`}>{status.label}</Text>
          </View>
        </View>

        <View className="gap-1">
          <Text className="font-heading text-base font-medium leading-snug text-text-primary ">
            {item.title}
          </Text>
          {item.week && (
            <Text className="text-xs text-text-muted ">{item.week.name}</Text>
          )}
        </View>

        {dispatch.due_at && dispatch.completion_status !== "completed" && (
          <Text className="text-xs text-text-muted ">
            Due{" "}
            {new Date(dispatch.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </Text>
        )}
      </Pressable>
    </Link>
  );
}