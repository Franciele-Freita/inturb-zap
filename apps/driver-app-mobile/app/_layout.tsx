import { useEffect, useState } from "react";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold
} from "@expo-google-fonts/poppins";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppSplash } from "../components/app-splash";
import {
  addDriverNotificationReceivedListener,
  addDriverNotificationResponseListener
} from "../lib/notifications";
import { colors } from "../theme/tokens";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isBrandSplashVisible, setIsBrandSplashVisible] = useState(true);
  const [pendingRideNotificationId, setPendingRideNotificationId] = useState<string | null>(null);
  const pathname = usePathname();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    SplashScreen.hideAsync().catch(() => undefined);

    const timeoutId = setTimeout(() => {
      setIsBrandSplashVisible(false);
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [fontsLoaded]);

  useEffect(() => {
    let removeResponseListener: (() => void) | undefined;
    let removeReceivedListener: (() => void) | undefined;

    void addDriverNotificationResponseListener((rideId) => {
      setPendingRideNotificationId(null);
      router.push({
        pathname: "/ride/[rideId]",
        params: { rideId }
      });
    }).then((cleanup) => {
      removeResponseListener = cleanup;
    });

    void addDriverNotificationReceivedListener((rideId) => {
      setPendingRideNotificationId(rideId);
    }).then((cleanup) => {
      removeReceivedListener = cleanup;
    });

    return () => {
      removeResponseListener?.();
      removeReceivedListener?.();
    };
  }, []);

  if (!fontsLoaded || isBrandSplashVisible) {
    return (
      <>
        <StatusBar style="light" />
        <AppSplash />
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={colors.white} translucent={false} />
      {pendingRideNotificationId && pathname !== "/" ? (
        <View style={styles.notificationBannerWrap}>
          <Pressable
            style={styles.notificationBanner}
            onPress={() => {
              const rideId = pendingRideNotificationId;
              setPendingRideNotificationId(null);
              router.push({
                pathname: "/ride/[rideId]",
                params: { rideId }
              });
            }}
          >
            <View style={styles.notificationBannerCopy}>
              <Text style={styles.notificationBannerTitle}>Nova corrida recebida</Text>
              <Text style={styles.notificationBannerBody}>Toque para abrir os detalhes e decidir.</Text>
            </View>
            <Text style={styles.notificationBannerAction}>Abrir</Text>
          </Pressable>
        </View>
      ) : null}
      <Stack
        screenOptions={{
          freezeOnBlur: true,
          headerStyle: {
            backgroundColor: colors.white
          },
          headerTintColor: colors.textStrong,
          headerTitleStyle: {
            fontFamily: "Poppins_600SemiBold",
            color: colors.textStrong
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.surface
          }
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="home"
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: "Meu perfil"
          }}
        />
        <Stack.Screen
          name="vehicle"
          options={{
            title: "Veiculo ativo"
          }}
        />
        <Stack.Screen
          name="history"
          options={{
            title: "Historico"
          }}
        />
        <Stack.Screen
          name="preferences"
          options={{
            title: "Preferencias"
          }}
        />
        <Stack.Screen
          name="ride/[rideId]"
          options={{
            title: "Corrida"
          }}
        />
        <Stack.Screen
          name="ride-map/[rideId]"
          options={{
            title: "Mapa da corrida"
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  notificationBannerWrap: {
    position: "absolute",
    top: 58,
    left: 16,
    right: 16,
    zIndex: 100
  },
  notificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.highlight,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6
  },
  notificationBannerCopy: {
    flex: 1,
    gap: 2
  },
  notificationBannerTitle: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  notificationBannerBody: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular"
  },
  notificationBannerAction: {
    color: colors.white,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold"
  }
});
