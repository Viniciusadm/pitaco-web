import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TournamentResponse } from "@/api/types";
import { cn } from "@/lib/utils";

export function TournamentSelect({
  tournaments,
  value,
  onChange,
  disabled,
  placeholder = "Escolha o campeonato",
  className,
}: {
  tournaments: TournamentResponse[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {tournaments.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PoolTournamentField({
  tournaments,
  loading,
  value,
  onChange,
  className,
}: {
  tournaments: TournamentResponse[];
  loading: boolean;
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>Campeonato</Label>
      {loading ? (
        <Skeleton className="h-12 rounded-md" />
      ) : tournaments.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
          Nenhum campeonato disponível no momento.
        </p>
      ) : (
        <TournamentSelect
          tournaments={tournaments}
          value={value}
          onChange={onChange}
          className="h-12 text-base"
        />
      )}
    </div>
  );
}
