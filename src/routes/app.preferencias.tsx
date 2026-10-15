import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellRing, Copy } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { getToken } from "@/api/session";
import { useMe, useUpdateUserPreferences } from "@/api/auth";
import {
  useGlobalNotificationPreferences,
  useUpdateGlobalNotificationPreferences,
} from "@/api/notifications";
import { disablePush, enablePush, getPushFlag, pushPermission, pushSupported } from "@/lib/fcm";
import { useOnline } from "@/hooks/use-online";
import type { PreferenceItem } from "@/api/types";

export const Route = createFileRoute("/app/preferencias")({
  head: () => ({ meta: [{ title: "Preferências - Pitaco" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getToken()) {
      throw redirect({ to: "/login" });
    }
  },
  component: PreferencesPage,
});

const PUSH_CHANNEL = "push";

const NOTIFICATION_TYPES: { type: string; label: string; help: string }[] = [
  {
    type: "new_match",
    label: "Nova partida marcada",
    help: "Quando uma nova partida é adicionada ao bolão.",
  },
  {
    type: "match_result",
    label: "Resultado disponível",
    help: "Quando uma partida em que você palpitou tem resultado final.",
  },
  {
    type: "prediction_reminder",
    label: "Lembrete de palpite",
    help: "Antes do início de partidas que ainda esperam seu palpite.",
  },
  {
    type: "member_joined",
    label: "Novo participante",
    help: "Quando alguém entra em um bolão que você administra.",
  },
];

function masterEnabled(): boolean {
  return pushPermission() === "granted" && getPushFlag() !== "off";
}

function PreferencesPage() {
  const online = useOnline();
  const supported = pushSupported();
  const prefs = useGlobalNotificationPreferences();
  const updatePrefs = useUpdateGlobalNotificationPreferences();
  const me = useMe();
  const updateUserPrefs = useUpdateUserPreferences();

  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [enabledByType, setEnabledByType] = useState<Record<string, boolean>>({});
  const [syncPredictions, setSyncPredictions] = useState(true);

  useEffect(() => {
    setPushOn(masterEnabled());
  }, []);

  useEffect(() => {
    if (me.data) {
      setSyncPredictions(me.data.user.sync_predictions_across_pools);
    }
  }, [me.data]);

  const toggleSyncPredictions = (next: boolean) => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    setSyncPredictions(next);
    updateUserPrefs.mutate(
      { sync_predictions_across_pools: next },
      {
        onError: (error) => {
          setSyncPredictions(!next);
          toast.error(error instanceof Error ? error.message : "Não foi possível atualizar");
        },
      },
    );
  };

  // Backend defaults to enabled when no row exists, so mirror that here.
  useEffect(() => {
    const map: Record<string, boolean> = {};
    for (const item of NOTIFICATION_TYPES) {
      const found = (prefs.data ?? []).find(
        (p) => p.type === item.type && p.channel === PUSH_CHANNEL,
      );
      map[item.type] = found ? found.enabled : true;
    }
    setEnabledByType(map);
  }, [prefs.data]);

  const toggleMaster = async (next: boolean) => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (next) {
        const result = await enablePush();
        if (result === "granted") {
          setPushOn(true);
          toast.success("Notificações ativadas");
        } else if (result === "denied") {
          setPushOn(false);
          toast.error(
            "Você bloqueou as notificações no navegador. Libere nas configurações do site para ativar.",
          );
        } else {
          setPushOn(false);
          toast.error("Este navegador não suporta notificações push.");
        }
      } else {
        await disablePush();
        setPushOn(false);
        toast.success("Notificações desativadas");
      }
    } finally {
      setPushBusy(false);
    }
  };

  const toggleType = (type: string, next: boolean) => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    const optimistic = { ...enabledByType, [type]: next };
    setEnabledByType(optimistic);
    const payload: PreferenceItem[] = NOTIFICATION_TYPES.map((item) => ({
      type: item.type,
      channel: PUSH_CHANNEL,
      enabled: optimistic[item.type] ?? true,
    }));
    updatePrefs.mutate(payload, {
      onError: (error) => {
        setEnabledByType((prev) => ({ ...prev, [type]: !next }));
        toast.error(error instanceof Error ? error.message : "Não foi possível atualizar");
      },
    });
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Preferências</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configurações da sua conta.</p>
      </header>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Copy className="h-4 w-4 text-muted-foreground" />
            Palpites
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Reaproveite seus palpites entre os bolões que você participa.
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm">Usar o mesmo palpite em todos os bolões</p>
              <p className="text-xs text-muted-foreground">
                Ao salvar um palpite, ele é copiado para seus outros bolões do mesmo campeonato que
                ainda estiverem abertos.
              </p>
            </div>
            <Switch
              checked={syncPredictions}
              onCheckedChange={toggleSyncPredictions}
              disabled={me.isPending || updateUserPrefs.isPending || !online}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <BellRing className="h-4 w-4 text-muted-foreground" />
            Notificações push
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Receba avisos no dispositivo mesmo com o site fechado.
          </p>

          {!supported ? (
            <p className="mt-4 rounded-xl bg-surface px-3 py-2.5 text-sm text-muted-foreground">
              Este navegador não suporta notificações push.
            </p>
          ) : (
            <>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-surface px-3 py-2.5">
                <div className="flex items-center gap-3 text-sm">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  Ativar notificações push neste dispositivo
                </div>
                <Switch checked={pushOn} onCheckedChange={toggleMaster} disabled={pushBusy} />
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold">Escolha quais notificações receber</h3>
                {!pushOn && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ative as notificações acima para escolher quais avisos receber.
                  </p>
                )}
                {prefs.isError ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Não foi possível carregar as preferências.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {NOTIFICATION_TYPES.map((item) => (
                      <div
                        key={item.type}
                        className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.help}</p>
                        </div>
                        <Switch
                          checked={enabledByType[item.type] ?? true}
                          onCheckedChange={(next) => toggleType(item.type, next)}
                          disabled={!pushOn || prefs.isPending || updatePrefs.isPending || !online}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
