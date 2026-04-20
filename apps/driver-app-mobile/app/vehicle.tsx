import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadStoredDriverSession, saveStoredDriverSession } from "../lib/session";
import {
  request,
  type DriverFleetChecklistItem,
  type DriverFleetVehicleDetails,
  type DriverLoginResult,
  type DriverProfile,
  type DriverVehicle,
  type StartFleetVehicleSessionInput
} from "../lib/api";
import { colors } from "../theme/tokens";

function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function VehicleInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function VehicleStatusBadge({ active }: { active: boolean }) {
  return (
    <Text style={[styles.statusBadge, active ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
      {active ? "Veiculo ativo" : "Veiculo indisponivel"}
    </Text>
  );
}

function RoutineChecklistSection({
  title,
  subtitle,
  items,
  pendingChecklistItemKey,
  checklistNumericDrafts,
  onChangeNumericDraft,
  onToggleItem
}: {
  title: string;
  subtitle: string;
  items: DriverFleetChecklistItem[];
  pendingChecklistItemKey: string | null;
  checklistNumericDrafts: Record<string, string>;
  onChangeNumericDraft: (itemKey: string, value: string) => void;
  onToggleItem: (item: DriverFleetChecklistItem, value?: boolean | number) => void;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.routineSection}>
      <View style={styles.routineHeader}>
        <Text style={styles.routineTitle}>{title}</Text>
        <Text style={styles.routineSubtitle}>{subtitle}</Text>
      </View>

      {items.map((item) =>
        item.inputType === "ODOMETER" ? (
          <View key={item.itemKey} style={[styles.checklistCard, item.isChecked ? styles.checklistCardDone : undefined]}>
            <View style={styles.checklistCopy}>
              <Text style={styles.checklistTitle}>{item.label}</Text>
              <Text style={styles.checklistMeta}>
                {item.isChecked && item.numericValue !== undefined
                  ? `Registrado: ${item.numericValue} km`
                  : "Informe a kilometragem para concluir"}
              </Text>
            </View>
            <View style={styles.checklistNumericAction}>
              <TextInput
                value={checklistNumericDrafts[item.itemKey] ?? ""}
                onChangeText={(value) => onChangeNumericDraft(item.itemKey, value.replace(/\D/g, ""))}
                placeholder="KM"
                placeholderTextColor="#9B95B4"
                keyboardType="number-pad"
                style={styles.checklistNumericInput}
              />
              <Pressable
                style={[
                  styles.checklistSaveButton,
                  pendingChecklistItemKey === item.itemKey ? styles.checklistSaveButtonDisabled : undefined
                ]}
                disabled={pendingChecklistItemKey === item.itemKey || !(checklistNumericDrafts[item.itemKey] ?? "").trim()}
                onPress={() => onToggleItem(item, Number(checklistNumericDrafts[item.itemKey]))}
              >
                <Text style={styles.checklistSaveButtonLabel}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            key={item.itemKey}
            style={[styles.checklistCard, item.isChecked ? styles.checklistCardDone : undefined]}
            onPress={() => onToggleItem(item, !item.isChecked)}
            disabled={pendingChecklistItemKey === item.itemKey}
          >
            <View style={styles.checklistCopy}>
              <Text style={styles.checklistTitle}>{item.label}</Text>
              <Text style={styles.checklistMeta}>
                {item.isChecked
                  ? `Concluido em ${formatDateTime(item.checkedAt)}`
                  : item.description ?? "Marque quando a verificacao for concluida"}
              </Text>
            </View>
            <Switch
              value={item.isChecked}
              onValueChange={(value) => onToggleItem(item, value)}
              disabled={pendingChecklistItemKey === item.itemKey}
              trackColor={{ false: "#E8E1FF", true: "#CDBEFF" }}
              thumbColor={item.isChecked ? colors.highlight : colors.white}
            />
          </Pressable>
        )
      )}
    </View>
  );
}

export default function DriverVehicleScreen() {
  const [session, setSession] = useState<DriverLoginResult | null>(null);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [fleetVehicle, setFleetVehicle] = useState<DriverFleetVehicleDetails | null>(null);
  const [checkInMethod, setCheckInMethod] = useState<"QR_CODE" | "PLATE">("QR_CODE");
  const [qrCodeToken, setQrCodeToken] = useState("");
  const [plateInput, setPlateInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [pendingChecklistItemKey, setPendingChecklistItemKey] = useState<string | null>(null);
  const [checklistNumericDrafts, setChecklistNumericDrafts] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState("");

  async function applyFreshProfile(driverId: string): Promise<DriverProfile> {
    const freshProfile = await request<DriverProfile>(`/drivers/${driverId}`);
    const storedSession = await loadStoredDriverSession();

    if (storedSession) {
      await saveStoredDriverSession({ ...storedSession, driver: freshProfile });
    }

    setSession((current) => (current ? { ...current, driver: freshProfile } : current));
    setProfile(freshProfile);

    if (freshProfile.driverType === "FROTA" && freshProfile.currentFleetVehicle) {
      const freshFleetVehicle = await request<DriverFleetVehicleDetails>(`/drivers/${driverId}/fleet-vehicle`);
      setFleetVehicle(freshFleetVehicle);
    } else {
      setFleetVehicle(null);
    }

    return freshProfile;
  }

  useEffect(() => {
    let isActive = true;

    async function loadVehicleData() {
      try {
        const storedSession = await loadStoredDriverSession();

        if (!storedSession) {
          router.replace("/");
          return;
        }

        if (!isActive) {
          return;
        }

        setSession(storedSession);
        setProfile(storedSession.driver);
        await applyFreshProfile(storedSession.driver.id);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar o veiculo.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadVehicleData();

    return () => {
      isActive = false;
    };
  }, []);

  const resolvedProfile = useMemo(() => profile ?? session?.driver ?? null, [profile, session]);
  const activeFleetVehicleSummary =
    resolvedProfile?.driverType === "FROTA" ? fleetVehicle ?? resolvedProfile.currentFleetVehicle ?? null : null;
  const activeVehicle = useMemo(
    () => resolvedProfile?.vehicles?.find((vehicle) => vehicle.isActive) ?? resolvedProfile?.vehicles?.[0] ?? null,
    [resolvedProfile]
  );
  const otherVehicles = useMemo(
    () =>
      resolvedProfile?.driverType === "AGREGADO"
        ? (resolvedProfile.vehicles ?? []).filter((vehicle) => vehicle.id !== activeVehicle?.id)
        : [],
    [resolvedProfile, activeVehicle]
  );
  const requiresFleetCheckIn =
    resolvedProfile?.driverType === "FROTA" && !activeFleetVehicleSummary;
  const startChecklistItems = useMemo(
    () =>
      (fleetVehicle?.checklist ?? [])
        .filter((item) => item.routine === "START_OF_DAY")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [fleetVehicle]
  );
  const endChecklistItems = useMemo(
    () =>
      (fleetVehicle?.checklist ?? [])
        .filter((item) => item.routine === "END_OF_DAY")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [fleetVehicle]
  );
  const canStartFleetSession =
    !!resolvedProfile &&
    resolvedProfile.driverType === "FROTA" &&
    (checkInMethod === "QR_CODE" ? qrCodeToken.trim().length > 0 : plateInput.trim().length > 0) &&
    !isStartingSession;

  useEffect(() => {
    if (!fleetVehicle) {
      setChecklistNumericDrafts({});
      return;
    }

    setChecklistNumericDrafts((current) => {
      const next: Record<string, string> = {};
      for (const item of fleetVehicle.checklist) {
        next[item.itemKey] =
          current[item.itemKey] ?? (item.numericValue !== undefined ? String(item.numericValue) : "");
      }
      return next;
    });
  }, [fleetVehicle]);

  async function handleStartFleetSession() {
    if (!resolvedProfile || resolvedProfile.driverType !== "FROTA" || !canStartFleetSession) {
      return;
    }

    setIsStartingSession(true);
    setStatusMessage("Validando carro da frota...");

    try {
      const payload: StartFleetVehicleSessionInput =
        checkInMethod === "QR_CODE"
          ? { qrCodeToken: qrCodeToken.trim() }
          : { plate: plateInput.trim().toUpperCase() };
      const updatedProfile = await request<DriverProfile>(
        `/drivers/${resolvedProfile.id}/fleet-vehicle-session/start`,
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      const storedSession = await loadStoredDriverSession();
      if (storedSession) {
        await saveStoredDriverSession({ ...storedSession, driver: updatedProfile });
      }

      setSession((current) => (current ? { ...current, driver: updatedProfile } : current));
      setProfile(updatedProfile);
      setQrCodeToken("");
      setPlateInput("");

      if (updatedProfile.currentFleetVehicle) {
        const activeFleetVehicle = await request<DriverFleetVehicleDetails>(
          `/drivers/${resolvedProfile.id}/fleet-vehicle`
        );
        setFleetVehicle(activeFleetVehicle);
        setStatusMessage(`Carro ${activeFleetVehicle.label} validado. Checklist liberado para o turno.`);
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao validar carro da frota.");
    } finally {
      setIsStartingSession(false);
    }
  }

  async function handleEndFleetSession() {
    if (!resolvedProfile || resolvedProfile.driverType !== "FROTA" || isEndingSession) {
      return;
    }

    setIsEndingSession(true);
    setStatusMessage("Encerrando uso do carro atual...");

    try {
      const updatedProfile = await request<DriverProfile>(
        `/drivers/${resolvedProfile.id}/fleet-vehicle-session/end`,
        {
          method: "POST"
        }
      );

      const storedSession = await loadStoredDriverSession();
      if (storedSession) {
        await saveStoredDriverSession({ ...storedSession, driver: updatedProfile });
      }

      setSession((current) => (current ? { ...current, driver: updatedProfile } : current));
      setProfile(updatedProfile);
      setFleetVehicle(null);
      setStatusMessage("Carro da frota encerrado. Valide outro veiculo para voltar a operar.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Falha ao encerrar carro da frota.");
    } finally {
      setIsEndingSession(false);
    }
  }

  async function handleChecklistToggle(item: DriverFleetChecklistItem, value?: boolean | number) {
    if (!resolvedProfile || resolvedProfile.driverType !== "FROTA") {
      return;
    }

    setPendingChecklistItemKey(item.itemKey);
    try {
      const updated = await request<DriverFleetVehicleDetails>(`/drivers/${resolvedProfile.id}/fleet-vehicle/checklist`, {
        method: "POST",
        body: JSON.stringify(
          item.inputType === "ODOMETER"
            ? { itemKey: item.itemKey, numericValue: typeof value === "number" ? value : undefined }
            : { itemKey: item.itemKey, isChecked: Boolean(value) }
        )
      });

      setFleetVehicle(updated);
      setStatusMessage(`Checklist diario de ${updated.label} atualizado.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Falha ao atualizar checklist diario."
      );
    } finally {
      setPendingChecklistItemKey(null);
    }
  }

  if (isLoading && !resolvedProfile) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["top", "left", "right"]}>
        <ActivityIndicator color={colors.highlight} />
      </SafeAreaView>
    );
  }

  if (!resolvedProfile) {
    return <SafeAreaView style={styles.loadingScreen} edges={["top", "left", "right"]} />;
  }

  const heroVehicleLabel =
    activeFleetVehicleSummary?.label ||
    (resolvedProfile.driverType === "FROTA" && resolvedProfile.defaultFleetVehicle?.label) ||
    activeVehicle?.label ||
    resolvedProfile.vehicle ||
    "Nenhum veiculo ativo";
  const heroVehiclePlate =
    activeFleetVehicleSummary?.plate ||
    (resolvedProfile.driverType === "FROTA" ? resolvedProfile.defaultFleetVehicle?.plate : undefined) ||
    activeVehicle?.plate;
  const heroOverline = requiresFleetCheckIn ? "Validacao do carro" : "Veiculo ativo";
  const heroSubtitle = requiresFleetCheckIn
    ? resolvedProfile.fleetAssignmentMode === "FIXED"
      ? resolvedProfile.defaultFleetVehicle
        ? `Valide o carro fixo ${resolvedProfile.defaultFleetVehicle.plate} antes de operar`
        : "Defina um carro fixo com a operacao antes de iniciar o turno"
      : "Valide o carro disponivel na garagem via QR Code ou placa"
    : heroVehiclePlate
      ? `Placa ${heroVehiclePlate}`
      : "Sem placa cadastrada";

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroOverline}>{heroOverline}</Text>
          <Text style={styles.heroTitle}>{heroVehicleLabel}</Text>
          <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
        </View>

        {requiresFleetCheckIn ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderColumn}>
              <Text style={styles.sectionTitle}>Liberar carro para o turno</Text>
              <Text style={styles.sectionSubtitle}>
                {resolvedProfile.fleetAssignmentMode === "FIXED"
                  ? resolvedProfile.defaultFleetVehicle
                    ? `Esse motorista opera com o carro fixo ${resolvedProfile.defaultFleetVehicle.label} - ${resolvedProfile.defaultFleetVehicle.plate}.`
                    : "Esse motorista esta configurado com carro fixo, mas ainda nao ha um veiculo padrao definido."
                  : "Escolha o carro disponivel na garagem e valide antes de entrar na operacao."}
              </Text>
            </View>

            <View style={styles.checkInMethodRow}>
              <Pressable
                style={[
                  styles.checkInMethodButton,
                  checkInMethod === "QR_CODE" ? styles.checkInMethodButtonActive : undefined
                ]}
                onPress={() => setCheckInMethod("QR_CODE")}
              >
                <Text
                  style={[
                    styles.checkInMethodLabel,
                    checkInMethod === "QR_CODE" ? styles.checkInMethodLabelActive : undefined
                  ]}
                >
                  Codigo do QR
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.checkInMethodButton,
                  checkInMethod === "PLATE" ? styles.checkInMethodButtonActive : undefined
                ]}
                onPress={() => setCheckInMethod("PLATE")}
              >
                <Text
                  style={[
                    styles.checkInMethodLabel,
                    checkInMethod === "PLATE" ? styles.checkInMethodLabelActive : undefined
                  ]}
                >
                  Placa
                </Text>
              </Pressable>
            </View>

            {checkInMethod === "QR_CODE" ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Codigo do QR</Text>
                <TextInput
                  value={qrCodeToken}
                  onChangeText={setQrCodeToken}
                  placeholder="Digite ou cole o codigo do QR"
                  placeholderTextColor="#9B95B4"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Placa do carro</Text>
                <TextInput
                  value={plateInput}
                  onChangeText={(value) => setPlateInput(value.toUpperCase())}
                  placeholder="ABC1D23"
                  placeholderTextColor="#9B95B4"
                  style={styles.input}
                  autoCapitalize="characters"
                />
              </View>
            )}

            <Pressable
              style={[styles.primaryActionButton, !canStartFleetSession ? styles.primaryActionButtonDisabled : undefined]}
              disabled={!canStartFleetSession}
              onPress={() => void handleStartFleetSession()}
            >
              <Text style={styles.primaryActionLabel}>{isStartingSession ? "Validando..." : "Validar carro"}</Text>
            </Pressable>
          </View>
        ) : null}

        {!requiresFleetCheckIn ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Detalhes do veiculo</Text>
              <VehicleStatusBadge
                active={
                  resolvedProfile.driverType === "FROTA"
                    ? activeFleetVehicleSummary?.status === "ALLOCATED"
                    : (activeVehicle?.isActive ?? false)
                }
              />
            </View>

            <VehicleInfoItem label="Modelo" value={heroVehicleLabel} />
            <VehicleInfoItem label="Placa" value={heroVehiclePlate || "-"} />
            <VehicleInfoItem label="Cor" value={activeFleetVehicleSummary?.color || activeVehicle?.color || "-"} />
            <VehicleInfoItem
              label="Ano"
              value={
                activeFleetVehicleSummary?.year
                  ? String(activeFleetVehicleSummary.year)
                  : activeVehicle?.year
                    ? String(activeVehicle.year)
                    : "-"
              }
            />
            <VehicleInfoItem
              label={resolvedProfile.driverType === "FROTA" ? "Validado desde" : "Cadastrado em"}
              value={formatDateTime(
                resolvedProfile.driverType === "FROTA" ? activeFleetVehicleSummary?.startedAt : activeVehicle?.createdAt
              )}
            />
            {resolvedProfile.driverType === "FROTA" ? (
              <Pressable
                style={styles.secondaryActionButton}
                disabled={isEndingSession}
                onPress={() => void handleEndFleetSession()}
              >
                <Text style={styles.secondaryActionLabel}>{isEndingSession ? "Encerrando..." : "Encerrar carro atual"}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {resolvedProfile.driverType === "FROTA" && !requiresFleetCheckIn ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderColumn}>
              <Text style={styles.sectionTitle}>Checklist diario</Text>
              <Text style={styles.sectionSubtitle}>
                Complete a revisao do carro antes de sair para a operacao.
              </Text>
            </View>

            {fleetVehicle ? (
              <View style={styles.checklistList}>
                <RoutineChecklistSection
                  title="Inicio do dia"
                  subtitle="Checklist tecnico e operacional antes de sair para a operacao."
                  items={startChecklistItems}
                  pendingChecklistItemKey={pendingChecklistItemKey}
                  checklistNumericDrafts={checklistNumericDrafts}
                  onChangeNumericDraft={(itemKey, value) =>
                    setChecklistNumericDrafts((current) => ({ ...current, [itemKey]: value }))
                  }
                  onToggleItem={(item, value) => void handleChecklistToggle(item, value)}
                />
                <RoutineChecklistSection
                  title="Final do dia"
                  subtitle="Itens de fechamento para encerrar o uso do veiculo."
                  items={endChecklistItems}
                  pendingChecklistItemKey={pendingChecklistItemKey}
                  checklistNumericDrafts={checklistNumericDrafts}
                  onChangeNumericDraft={(itemKey, value) =>
                    setChecklistNumericDrafts((current) => ({ ...current, [itemKey]: value }))
                  }
                  onToggleItem={(item, value) => void handleChecklistToggle(item, value)}
                />
              </View>
            ) : (
              <View style={styles.messageCard}>
                <Text style={styles.messageText}>
                  Nenhum carro da frota foi validado no momento para preencher o checklist diario.
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {otherVehicles.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Outros veiculos</Text>

            <View style={styles.vehicleList}>
              {otherVehicles.map((vehicle) => (
                <VehicleMiniCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </View>
          </View>
        ) : null}

        {statusMessage ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>{statusMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function VehicleMiniCard({ vehicle }: { vehicle: DriverVehicle }) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniCardHeader}>
        <Text style={styles.miniCardTitle}>{vehicle.label}</Text>
        <VehicleStatusBadge active={vehicle.isActive} />
      </View>
      <Text style={styles.miniCardMeta}>Placa: {vehicle.plate}</Text>
      <Text style={styles.miniCardMeta}>Cor: {vehicle.color || "-"}</Text>
      <Text style={styles.miniCardMeta}>Ano: {vehicle.year ? String(vehicle.year) : "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 18
  },
  heroCard: {
    gap: 6,
    padding: 24,
    borderRadius: 28,
    backgroundColor: colors.highlight
  },
  heroOverline: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  heroTitle: {
    color: colors.white,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: "Poppins_700Bold"
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  section: {
    gap: 12,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  sectionHeaderColumn: {
    gap: 4
  },
  sectionTitle: {
    flex: 1,
    color: colors.textStrong,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  fieldGroup: {
    gap: 8
  },
  inputLabel: {
    color: colors.textStrong,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD4FA",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FAF8FF",
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_500Medium"
  },
  checkInMethodRow: {
    flexDirection: "row",
    gap: 10
  },
  checkInMethodButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#F2EEFF"
  },
  checkInMethodButtonActive: {
    backgroundColor: "#E3DBFF"
  },
  checkInMethodLabel: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  },
  checkInMethodLabelActive: {
    color: colors.highlight
  },
  primaryActionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: colors.highlight
  },
  primaryActionButtonDisabled: {
    opacity: 0.45
  },
  primaryActionLabel: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  secondaryActionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#F2EEFF"
  },
  secondaryActionLabel: {
    color: colors.highlight,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  statusBadgeActive: {
    color: "#167A47",
    backgroundColor: "#EAFBF1"
  },
  statusBadgeInactive: {
    color: "#8C5A00",
    backgroundColor: "#FFF4D6"
  },
  infoItem: {
    gap: 2,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1ECFF"
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  infoValue: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_500Medium"
  },
  checklistList: {
    gap: 12
  },
  routineSection: {
    gap: 10
  },
  routineHeader: {
    gap: 4
  },
  routineTitle: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  routineSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  checklistCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F7F3FF"
  },
  checklistCardDone: {
    backgroundColor: "#F0ECFF"
  },
  checklistCopy: {
    flex: 1,
    gap: 4
  },
  checklistTitle: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  checklistMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  checklistNumericAction: {
    width: 104,
    gap: 8
  },
  checklistNumericInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7C8FF",
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textStrong,
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold"
  },
  checklistSaveButton: {
    borderRadius: 12,
    backgroundColor: colors.highlight,
    paddingVertical: 10,
    alignItems: "center"
  },
  checklistSaveButtonDisabled: {
    opacity: 0.6
  },
  checklistSaveButtonLabel: {
    color: colors.white,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold"
  },
  vehicleList: {
    gap: 12
  },
  miniCard: {
    gap: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F7F3FF"
  },
  miniCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  miniCardTitle: {
    flex: 1,
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  miniCardMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  messageCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFF4D6"
  },
  messageText: {
    color: "#8A6400",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  }
});
