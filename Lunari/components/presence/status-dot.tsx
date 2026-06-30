import { clsx } from "clsx";
import type { ProfileStatus } from "@/lib/types/database";

const COLORS: Record<ProfileStatus, string> = {
  active: "bg-green-500",
  away: "bg-yellow-500",
  offline: "bg-neutral-400",
};

export function StatusDot({ status }: { status: ProfileStatus }) {
  return (
    <span
      className={clsx("inline-block h-2.5 w-2.5 rounded-full", COLORS[status])}
      title={status}
    />
  );
}
