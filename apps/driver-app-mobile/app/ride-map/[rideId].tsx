import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { RideRouteMap } from "../../components/ride-route-map";
import { request, type DriverLoginResult, type Ride, type RideMapPreview } from "../../lib/api";
import { getCachedRideMapPreview, setCachedRideMapPreview } from "../../lib/ride-map-preview-cache";
import { loadStoredDriverSession } from "../../lib/session";
import { colors } from "../../theme/tokens";

export default function RideMapScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [ride, setRide] = useState<Ride | null>(null);
  const [preview, setPreview] = useState<RideMapPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [sheetLevel, setSheetLevel] = useState<"compact" | "expanded">("compact");
  const [focusedPoint, setFocusedPoint] = useState<{ target: "origin" | "destination" | null; revision: number }>({
    target: null,
    revision: 0
  });
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  const expandedHeight = useMemo(() => {
    return Math.min(430, Math.max(320, Math.round(windowHeight * 0.46)));
  }, [windowHeight]);

  const compactVisibleHeight = useMemo(() => {
    return Math.min(220, Math.max(176, Math.round(windowHeight * 0.23)));
  }, [windowHeight]);

  const compactOffset = Math.max(0, expandedHeight - compactVisibleHeight);

  useEffect(() => {
    sheetTranslateY.setValue(sheetLevel === "compact" ? compactOffset : 0);
  }, [compactOffset, sheetLevel, sheetTranslateY]);

  function snapSheet(level: "compact" | "expanded") {
    setSheetLevel(level);
    Animated.spring(sheetTranslateY, {
      toValue: level === "compact" ? compactOffset : 0,
      useNativeDriver: true,
      damping: 24,
      stiffness: 220,
      mass: 0.9
    }).start();
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
        onPanResponderMove: (_, gesture) => {
          const baseOffset = sheetLevel === "compact" ? compactOffset : 0;
          const nextValue = Math.max(0, Math.min(compactOffset, baseOffset + gesture.dy));
          sheetTranslateY.setValue(nextValue);
        },
        onPanResponderRelease: (_, gesture) => {
          const baseOffset = sheetLevel === "compact" ? compactOffset : 0;
          const currentOffset = Math.max(0, Math.min(compactOffset, baseOffset + gesture.dy));
          const shouldExpand = gesture.vy < -0.45 || currentOffset < compactOffset / 2;
          snapSheet(shouldExpand ? "expanded" : "compact");
        },
        onPanResponderTerminate: () => {
          snapSheet(sheetLevel);
        }
      }),
    [compactOffset, sheetLevel, sheetTranslateY]
  );

  useEffect(() => {
    let isActive = true;

    async function loadMap() {
      try {
        const storedSession = await loadStoredDriverSession();
        if (!storedSession?.driver.id) {
          return;
        }

        const resolvedRide = await loadRide(storedSession, String(rideId));
        const cachedPreview = getCachedRideMapPreview(storedSession.driver.id, String(rideId));
        const rideMapPreview =
          cachedPreview ??
          (await request<RideMapPreview>(
            `/drivers/${storedSession.driver.id}/rides/${encodeURIComponent(String(rideId))}/map-preview`
          ));

        if (!isActive) {
          return;
        }

        setCachedRideMapPreview(storedSession.driver.id, String(rideId), rideMapPreview);
        setRide(resolvedRide);
        setPreview(rideMapPreview);
        setStatusMessage(rideMapPreview.available ? "" : rideMapPreview.error ?? "Mapa indisponivel no momento.");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatusMessage(error instanceof Error ? error.message : "Falha ao carregar o mapa da corrida.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadMap();

    return () => {
      isActive = false;
    };
  }, [rideId]);

  function focusPoint(target: "origin" | "destination") {
    setFocusedPoint((current) => ({ target, revision: current.revision + 1 }));
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right", "bottom"]}>
        <ActivityIndicator color={colors.highlight} />
      </SafeAreaView>
    );
  }

  if (!preview?.available || !ride) {
    return (
      <SafeAreaView style={styles.loadingScreen} edges={["left", "right", "bottom"]}>
        <Text style={styles.messageTitle}>Mapa indisponivel</Text>
        <Text style={styles.messageBody}>{statusMessage || "Nao foi possivel montar o mapa desta corrida."}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={styles.mapWrap}>
        <RideRouteMap
          preview={preview}
          interactive
          focusTarget={focusedPoint.target}
          focusRevision={focusedPoint.revision}
        />
      </View>

      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: expandedHeight + insets.bottom,
            paddingBottom: 22 + insets.bottom,
            transform: [{ translateY: sheetTranslateY }]
          }
        ]}
      >
        <View style={styles.sheetHandleArea} {...panResponder.panHandlers}>
          <View style={styles.sheetHandle} />
        </View>

        <View style={styles.bottomCard}>
          <Text style={styles.bottomTitle}>{ride.customerName}</Text>
          {preview.provider === "fallback" ? (
            <View style={styles.fallbackNotice}>
              <Text style={styles.fallbackNoticeTitle}>Rota aproximada</Text>
              <Text style={styles.fallbackNoticeBody}>
                Esta linha e uma estimativa simples entre origem e destino. O trajeto detalhado pode diferir nas vias reais.
              </Text>
            </View>
          ) : null}
          <Pressable style={styles.pointBlock} onPress={() => focusPoint("origin")}>
            <View style={[styles.dot, styles.originDot]} />
            <View style={styles.pointCopy}>
              <Text style={styles.pointLabel}>Origem</Text>
              <Text style={styles.pointValue}>{preview.origin?.label ?? ride.origin}</Text>
            </View>
          </Pressable>
          <Pressable style={styles.pointBlock} onPress={() => focusPoint("destination")}>
            <View style={[styles.dot, styles.destinationDot]} />
            <View style={styles.pointCopy}>
              <Text style={styles.pointLabel}>Destino</Text>
              <Text style={styles.pointValue}>{preview.destination?.label ?? ride.destination}</Text>
            </View>
          </Pressable>
          <View style={styles.hintChip}>
            <Text style={styles.hintChipLabel}>Arraste e aproxime o mapa para analisar a regiao</Text>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

async function loadRide(session: DriverLoginResult, rideId: string): Promise<Ride | null> {
  try {
    return await request<Ride>(
      `/drivers/${session.driver.id}/available-rides/${encodeURIComponent(rideId)}?includeScheduleFit=false`
    );
  } catch {
    const myRides = await request<Ride[]>(`/drivers/${session.driver.id}/my-rides?includeScheduleFit=false`);
    return myRides.find((entry) => entry.id === rideId) ?? null;
  }
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
    gap: 10,
    backgroundColor: colors.surface,
    paddingHorizontal: 24
  },
  messageTitle: {
    color: colors.textStrong,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  messageBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: "Poppins_400Regular"
  },
  mapWrap: {
    flex: 1
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 12
  },
  sheetHandleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D9D2F2"
  },
  bottomCard: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 10
  },
  fallbackNotice: {
    gap: 4,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#FFF6E8"
  },
  fallbackNoticeTitle: {
    color: "#8C5A00",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold"
  },
  fallbackNoticeBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_500Medium"
  },
  bottomTitle: {
    color: colors.textStrong,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Poppins_700Bold"
  },
  pointBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 5
  },
  originDot: {
    backgroundColor: colors.highlight
  },
  destinationDot: {
    backgroundColor: "#FB8A1C"
  },
  pointCopy: {
    flex: 1,
    gap: 4
  },
  pointLabel: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  pointValue: {
    color: colors.textStrong,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_500Medium"
  },
  hintChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#EEE8FF"
  },
  hintChipLabel: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold"
  }
});
