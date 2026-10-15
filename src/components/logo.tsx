import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl gold-gradient shadow-[var(--shadow-gold)]">
        <Trophy className="h-5 w-5 text-primary-foreground" />
      </span>
      <span className="font-display text-lg font-semibold">Pitaco</span>
    </span>
  );
}
