import { useState } from "react";
import { Check, ChevronsUpDown, Plus, KeyRound, Trophy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePools } from "@/api/pools";
import { useAuthStore } from "@/store/auth-store";
import { CreatePoolDialog } from "@/components/create-pool-dialog";
import { JoinPoolDialog } from "@/components/join-pool-dialog";

export function PoolSwitcher({ variant = "sidebar" }: { variant?: "sidebar" | "topbar" }) {
  const pools = usePools();
  const poolId = useAuthStore((s) => s.poolId);
  const setPoolId = useAuthStore((s) => s.setPoolId);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const poolName = pools.data?.find((p) => p.id === poolId)?.name ?? "";
  const isTopbar = variant === "topbar";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex items-center gap-2.5 rounded-xl outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring",
            isTopbar ? "flex-row-reverse" : "w-full px-2 py-1.5 text-left",
          )}
        >
          <div
            className={cn(
              "grid place-items-center rounded-xl gold-gradient",
              isTopbar ? "h-8 w-8 rounded-lg" : "h-9 w-9",
            )}
          >
            <Trophy className={cn("text-primary-foreground", isTopbar ? "h-4 w-4" : "h-5 w-5")} />
          </div>
          <div className={cn("min-w-0", isTopbar && "text-right")}>
            <div className="font-display text-sm font-semibold leading-tight">Pitaco</div>
            <div
              className={cn(
                "truncate text-muted-foreground",
                isTopbar ? "text-[10px]" : "text-[11px]",
              )}
            >
              {poolName || "Selecionar bolão"}
            </div>
          </div>
          {!isTopbar && (
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align={isTopbar ? "end" : "start"} className="w-60">
          <DropdownMenuLabel>Seus bolões</DropdownMenuLabel>
          {pools.data?.map((pool) => (
            <DropdownMenuItem key={pool.id} onSelect={() => setPoolId(pool.id)} className="gap-2">
              <Check className={cn("h-4 w-4", pool.id === poolId ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{pool.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar bolão
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setJoinOpen(true)} className="gap-2">
            <KeyRound className="h-4 w-4" />
            Entrar em bolão
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePoolDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinPoolDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </>
  );
}
