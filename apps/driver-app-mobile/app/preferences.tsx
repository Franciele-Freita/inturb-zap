import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  defaultDriverPreferences,
  loadDriverPreferences,
  saveDriverPreferences,
  type DriverAppPreferences
} from "../lib/preferences";
import { colors } from "../theme/tokens";

type PreferenceKey = keyof DriverAppPreferences;

function PreferenceRow({
  title,
  description,
  value,
  onValueChange
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceTitle}>{title}</Text>
        <Text style={styles.preferenceDescription}>{description}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#DDD7F5", true: "#B9A8F3" }}
        thumbColor={value ? colors.highlight : "#FFFFFF"}
      />
    </View>
  );
}

export default function DriverPreferencesScreen() {
  const [preferences, setPreferences] = useState<DriverAppPreferences>(defaultDriverPreferences);
  const [statusMessage, setStatusMessage] = useState("Carregando suas preferencias...");

  useEffect(() => {
    let isActive = true;

    async function loadPreferences() {
      const storedPreferences = await loadDriverPreferences();
      if (!isActive) {
        return;
      }

      setPreferences(storedPreferences);
      setStatusMessage("Preferencias salvas neste aparelho.");
    }

    void loadPreferences();

    return () => {
      isActive = false;
    };
  }, []);

  async function updatePreference(key: PreferenceKey, value: boolean) {
    const nextPreferences = {
      ...preferences,
      [key]: value
    };

    setPreferences(nextPreferences);
    setStatusMessage("Salvando preferencias...");

    try {
      await saveDriverPreferences(nextPreferences);
      setStatusMessage("Preferencias atualizadas.");
    } catch {
      setStatusMessage("Nao foi possivel salvar agora.");
    }
  }

  async function openDeviceSettings() {
    const supported = await Linking.canOpenURL("app-settings:");

    if (supported) {
      await Linking.openSettings();
      return;
    }

    setStatusMessage("Nao foi possivel abrir os ajustes do aparelho.");
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroOverline}>Preferencias</Text>
          <Text style={styles.heroTitle}>Operacao do app</Text>
          <Text style={styles.heroSubtitle}>
            Ajuste alertas, comportamento da fila e configuracoes de uso em corrida.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aceites e notificacoes</Text>

          <PreferenceRow
            title="Receber novas corridas"
            description="Mostra alertas quando houver corrida aguardando seu aceite."
            value={preferences.notifyNewRides}
            onValueChange={(value) => void updatePreference("notifyNewRides", value)}
          />
          <PreferenceRow
            title="Som ao receber corrida"
            description="Toca um alerta sonoro quando chegar uma nova solicitacao."
            value={preferences.playRideSound}
            onValueChange={(value) => void updatePreference("playRideSound", value)}
          />
          <PreferenceRow
            title="Vibrar ao receber corrida"
            description="Aciona vibracao junto com o alerta de nova corrida."
            value={preferences.vibrateOnRide}
            onValueChange={(value) => void updatePreference("vibrateOnRide", value)}
          />
          <PreferenceRow
            title="Abrir fila automaticamente"
            description="Leva voce direto para a fila quando existir nova corrida pendente."
            value={preferences.autoOpenQueue}
            onValueChange={(value) => void updatePreference("autoOpenQueue", value)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localizacao e aparelho</Text>

          <PreferenceRow
            title="GPS em uso"
            description="Mantem sua localizacao disponivel enquanto voce usa o app."
            value={preferences.allowForegroundLocation}
            onValueChange={(value) => void updatePreference("allowForegroundLocation", value)}
          />
          <PreferenceRow
            title="GPS em segundo plano"
            description="Permite continuar atualizando localizacao durante operacao ativa."
            value={preferences.allowBackgroundLocation}
            onValueChange={(value) => void updatePreference("allowBackgroundLocation", value)}
          />
          <PreferenceRow
            title="Manter tela ativa"
            description="Evita que a tela apague durante turnos ou corridas em andamento."
            value={preferences.keepScreenAwakeOnShift}
            onValueChange={(value) => void updatePreference("keepScreenAwakeOnShift", value)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissoes do aparelho</Text>
          <Text style={styles.sectionBody}>
            Se precisar liberar GPS, notificacoes ou uso em segundo plano, abra os ajustes do sistema.
          </Text>

          <Pressable style={styles.settingsButton} onPress={() => void openDeviceSettings()}>
            <Text style={styles.settingsButtonLabel}>Abrir ajustes do aparelho</Text>
          </Pressable>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
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
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 6
  },
  preferenceCopy: {
    flex: 1,
    gap: 2
  },
  preferenceTitle: {
    color: colors.textStrong,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  preferenceDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular"
  },
  settingsButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#F3EEFF"
  },
  settingsButtonLabel: {
    color: colors.highlight,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  },
  statusCard: {
    gap: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F9F7FF"
  },
  statusLabel: {
    color: colors.highlight,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  }
});
