import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loadStoredDriverSession } from "../lib/session";
import { formatCurrency, formatDateTime, request, type DriverLoginResult, type Ride } from "../lib/api";
import { colors } from "../theme/tokens";

function isCompletedRide(ride: Ride): boolean {
  return ride.driverStage === "COMPLETED" || Boolean(ride.completedAt);
}

function getCompletedAt(ride: Ride): string {
  return ride.completedAt ?? ride.updatedAt ?? ride.scheduledAt;
}

function isNoShowRide(ride: Ride): boolean {
  return ride.status === "CANCELLED";
}

function getHistoryBadgeLabel(ride: Ride): string {
  return isNoShowRide(ride) ? "Nao embarcou" : "Concluida";
}

export default function DriverHistoryScreen() {
  const [session, setSession] = useState<DriverLoginResult | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadHistory() {
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

        const myRides = await request<Ride[]>(`/drivers/${storedSession.driver.id}/my-rides?includeScheduleFit=false`);
        if (!isActive) {
          return;
        }

        const completedRides = myRides
          .filter(isCompletedRide)
          .sort((left, right) => new Date(getCompletedAt(right)).getTime() - new Date(getCompletedAt(left)).getTime());

        setRides(completedRides);
        setStatusMessage(
          completedRides.length === 0
            ? "Nenhuma operacao encerrada ate o momento."
            : `${completedRides.length} operacao(oes) encerrada(s).`
        );
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar o historico.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, []);

  const totalEarned = useMemo(
    () => rides.reduce((sum, ride) => sum + (isNoShowRide(ride) ? 0 : ride.quote?.amount ?? 0), 0),
    [rides]
  );
  const averageTicket = useMemo(
    () => (rides.length > 0 ? totalEarned / rides.length : 0),
    [rides, totalEarned]
  );

  if (isLoading && !session) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["top", "left", "right"]}>
        <ActivityIndicator color={colors.highlight} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroOverline}>Historico</Text>
          <Text style={styles.heroTitle}>Operacoes encerradas</Text>
          <Text style={styles.heroSubtitle}>
            Consulte corridas concluidas e registros operacionais mais recentes.
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{rides.length}</Text>
            <Text style={styles.summaryLabel}>Operacoes</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatCurrency(totalEarned)}</Text>
            <Text style={styles.summaryLabel}>Total ganho</Text>
          </View>

          <View style={styles.summaryCardWide}>
            <Text style={styles.summaryValue}>{formatCurrency(averageTicket)}</Text>
            <Text style={styles.summaryLabel}>Ticket medio</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ultimas operacoes</Text>
          <Text style={styles.sectionBody}>{statusMessage}</Text>

          {isLoading ? (
            <View style={styles.loadingInline}>
              <ActivityIndicator color={colors.highlight} />
            </View>
          ) : null}

          {!isLoading && rides.length > 0 ? (
            <View style={styles.rideList}>
              {rides.map((ride) => (
                <View key={ride.id} style={styles.rideCard}>
                  <View style={styles.rideTopRow}>
                    <View style={styles.rideTopCopy}>
                      <Text style={styles.rideCustomer}>{ride.customerName}</Text>
                      <Text style={styles.rideDate}>{formatDateTime(getCompletedAt(ride))}</Text>
                    </View>

                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeLabel}>{getHistoryBadgeLabel(ride)}</Text>
                    </View>
                  </View>

                  <View style={styles.rideRouteBlock}>
                    <Text style={styles.rideRouteLabel}>Origem</Text>
                    <Text style={styles.rideRouteValue}>{ride.origin}</Text>
                  </View>

                  <View style={styles.rideRouteBlock}>
                    <Text style={styles.rideRouteLabel}>Destino</Text>
                    <Text style={styles.rideRouteValue}>{ride.destination}</Text>
                  </View>

                  <View style={styles.rideMetaRow}>
                    <Text style={styles.rideAmount}>{formatCurrency(ride.quote?.amount)}</Text>
                    <Text style={styles.rideMetaDivider}>•</Text>
                    <Text style={styles.rideMetaText}>
                      {ride.quote?.routeDistanceKm?.toFixed(1) ?? "0.0"} km
                    </Text>
                    <Text style={styles.rideMetaDivider}>•</Text>
                    <Text style={styles.rideMetaText}>
                      {ride.quote?.routeDurationMinutes ?? 0} min
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  summaryCard: {
    width: "48%",
    gap: 4,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.white
  },
  summaryCardWide: {
    width: "100%",
    gap: 4,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#F7F3FF"
  },
  summaryValue: {
    color: colors.textStrong,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Poppins_700Bold"
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
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
  sectionBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  loadingInline: {
    paddingVertical: 16
  },
  rideList: {
    gap: 14
  },
  rideCard: {
    gap: 10,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#F9F7FF"
  },
  rideTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  rideTopCopy: {
    flex: 1,
    gap: 2
  },
  rideCustomer: {
    color: colors.textStrong,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  rideDate: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  completedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#EAFBF1"
  },
  completedBadgeLabel: {
    color: "#167A47",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  rideRouteBlock: {
    gap: 2
  },
  rideRouteLabel: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  rideRouteValue: {
    color: colors.textStrong,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins_500Medium"
  },
  rideMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  rideAmount: {
    color: colors.highlight,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  rideMetaText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  rideMetaDivider: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  }
});
