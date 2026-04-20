import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadStoredDriverSession } from "../lib/session";
import { request, type DriverLoginResult, type DriverProfile } from "../lib/api";
import { colors } from "../theme/tokens";

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "M";
}

function formatCpf(value?: string): string {
  if (!value || value.length !== 11) {
    return value || "-";
  }

  return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
}

function formatPhone(value?: string): string {
  const digits = (value ?? "").replace(/\D/g, "");

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return value || "-";
}

function formatDateOnly(value?: string): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short"
  }).format(new Date(`${value}T00:00:00`));
}

function formatGender(value?: DriverProfile["gender"]): string {
  if (value === "FEMALE") {
    return "Feminino";
  }

  if (value === "MALE") {
    return "Masculino";
  }

  if (value === "NON_BINARY") {
    return "Nao binario";
  }

  if (value === "PREFER_NOT_TO_SAY") {
    return "Prefere nao informar";
  }

  return "-";
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function DriverProfileScreen() {
  const [session, setSession] = useState<DriverLoginResult | null>(null);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
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

        const freshProfile = await request<DriverProfile>(`/drivers/${storedSession.driver.id}`);
        if (!isActive) {
          return;
        }

        setProfile(freshProfile);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar o perfil.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  const resolvedProfile = useMemo(() => profile ?? session?.driver ?? null, [profile, session]);

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

  const activeVehicle =
    resolvedProfile.vehicles?.find((vehicle) => vehicle.isActive) ?? resolvedProfile.vehicles?.[0];
  const activeFleetVehicle = resolvedProfile.currentFleetVehicle;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{getInitial(resolvedProfile.name)}</Text>
          </View>

          <Text style={styles.name}>{resolvedProfile.name}</Text>
          <Text style={styles.statusBadge}>
            {resolvedProfile.isActive ? "Motorista ativo" : "Motorista inativo"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>

          <InfoItem label="CPF" value={formatCpf(resolvedProfile.cpf)} />
          <InfoItem label="Telefone" value={formatPhone(resolvedProfile.phone)} />
          <InfoItem label="E-mail" value={resolvedProfile.email || "-"} />
          <InfoItem label="Nascimento" value={formatDateOnly(resolvedProfile.birthDate)} />
          <InfoItem label="Genero" value={formatGender(resolvedProfile.gender)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Veiculo ativo</Text>

          <View style={styles.vehicleCard}>
            <Text style={styles.vehicleTitle}>
              {activeFleetVehicle?.label || activeVehicle?.label || resolvedProfile.vehicle || "Nenhum veiculo ativo"}
            </Text>
            <Text style={styles.vehicleMeta}>Placa: {activeFleetVehicle?.plate || activeVehicle?.plate || "-"}</Text>
            <Text style={styles.vehicleMeta}>Cor: {activeFleetVehicle?.color || activeVehicle?.color || "-"}</Text>
            <Text style={styles.vehicleMeta}>
              Ano: {activeFleetVehicle?.year ? String(activeFleetVehicle.year) : activeVehicle?.year ? String(activeVehicle.year) : "-"}
            </Text>
          </View>
        </View>

        {statusMessage ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>{statusMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
    alignItems: "center",
    gap: 10,
    padding: 24,
    borderRadius: 28,
    backgroundColor: colors.white
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8E1FF"
  },
  avatarLabel: {
    color: colors.highlight,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: "Poppins_700Bold"
  },
  name: {
    color: colors.textStrong,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
    fontFamily: "Poppins_700Bold"
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    color: colors.highlight,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
    backgroundColor: "#F1EDFF"
  },
  section: {
    gap: 12,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.white
  },
  sectionTitle: {
    color: colors.textStrong,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
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
  vehicleCard: {
    gap: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F7F3FF"
  },
  vehicleTitle: {
    color: colors.textStrong,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  vehicleMeta: {
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
