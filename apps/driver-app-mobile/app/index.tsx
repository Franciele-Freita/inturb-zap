import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { DriverLoginResult, digitsOnly, formatCpfInput, request } from "../lib/api";
import { loadStoredDriverSession, saveStoredDriverSession } from "../lib/session";
import { colors } from "../theme/tokens";

type StatusTone = "neutral" | "success" | "error";
type ActiveField = "cpf" | "password" | null;

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12C3.9 8.5 7.4 6 12 6C16.6 6 20.1 8.5 22 12C20.1 15.5 16.6 18 12 18C7.4 18 3.9 15.5 2 12Z"
        stroke={colors.textMuted}
        strokeWidth={1.8}
      />
      <Circle cx={12} cy={12} r={3.2} stroke={colors.textMuted} strokeWidth={1.8} />
      {!visible ? (
        <Path d="M4 20L20 4" stroke={colors.textMuted} strokeWidth={1.8} strokeLinecap="round" />
      ) : null}
    </Svg>
  );
}

function LoginArtwork({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.artwork, compact ? styles.artworkCompact : null]}>
      <View style={styles.artworkPurpleShape} />
      <View style={styles.artworkYellowShape} />
      <View style={styles.artworkBadge}>
        <Text style={styles.artworkBadgeText}>******</Text>
      </View>
      <View style={styles.artworkCard}>
        <View style={styles.artworkField} />
        <View style={styles.artworkField} />
        <View style={styles.artworkButton} />
      </View>
      <View style={styles.artworkLock}>
        <View style={styles.artworkLockHandle} />
      </View>
      <Svg width={86} height={86} viewBox="0 0 86 86" fill="none" style={styles.artworkFingerprint}>
        <Path
          d="M43 17C29.3 17 18 28.3 18 42C18 53.5 26.1 61.6 37.6 61.6C45.6 61.6 51.6 56.1 51.6 48.3C51.6 42.9 47.6 39 42.6 39C38.3 39 35.2 42.2 35.2 46.5C35.2 49.5 37.2 51.7 40.1 51.7"
          stroke="#44D7D0"
          strokeWidth={3.4}
          strokeLinecap="round"
        />
        <Path
          d="M57.7 26.9C53.9 22.4 48.4 19.6 42.3 19.6C31 19.6 21.8 28.8 21.8 40.1C21.8 49.6 28.3 56.1 37.8 56.1C44.5 56.1 49.2 51.4 49.2 44.8C49.2 40.4 46.2 37.2 42 37.2"
          stroke="#44D7D0"
          strokeWidth={3.4}
          strokeLinecap="round"
        />
      </Svg>
      <Svg width={66} height={42} viewBox="0 0 66 42" fill="none" style={styles.artworkTopStroke}>
        <Path
          d="M2 20C7.4 20 7.4 10 12.8 10C18.2 10 18.2 20 23.6 20C29 20 29 10 34.5 10"
          stroke={colors.highlight}
          strokeWidth={3.8}
          strokeLinecap="round"
        />
      </Svg>
      <Svg width={64} height={38} viewBox="0 0 64 38" fill="none" style={styles.artworkBottomStroke}>
        <Path
          d="M3 19C8.2 19 8.2 9 13.4 9C18.6 9 18.6 19 23.8 19C29 19 29 9 34.2 9C39.4 9 39.4 19 44.6 19"
          stroke="#FFC52E"
          strokeWidth={3.8}
          strokeLinecap="round"
        />
      </Svg>
      <Svg width={56} height={56} viewBox="0 0 56 56" fill="none" style={styles.artworkTriangle}>
        <Path d="M44 7L12 28L44 49V7Z" stroke="#44D7D0" strokeWidth={4} strokeLinejoin="round" />
      </Svg>
      <View style={styles.artworkOrangeRing} />
    </View>
  );
}

export default function DriverLoginScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const cpfInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [statusMessage, setStatusMessage] = useState("Entre com seu CPF e senha para acessar o app do motorista.");
  const [statusTone, setStatusTone] = useState<StatusTone>("neutral");

  const compactArtwork = windowHeight < 760;
  const sanitizedCpf = useMemo(() => digitsOnly(cpf), [cpf]);
  const canSubmit = sanitizedCpf.length === 11 && password.trim().length >= 6 && !isBusy;

  useEffect(() => {
    void loadStoredDriverSession()
      .then((storedSession) => {
        if (storedSession) {
          router.replace("/home");
        }
      })
      .finally(() => {
        setIsRestoringSession(false);
      });
  }, []);

  async function handleLogin() {
    if (!canSubmit) {
      return;
    }

    setIsBusy(true);
    setStatusTone("neutral");
    setStatusMessage("Validando suas credenciais...");

    try {
      const result = await request<DriverLoginResult>("/auth/driver/login", {
        method: "POST",
        body: JSON.stringify({
          cpf: sanitizedCpf,
          password
        })
      });

      await saveStoredDriverSession(result);
      setStatusTone("success");
      setStatusMessage(`Acesso liberado para ${result.driver.name}.`);
      setPassword("");
      router.replace(
        result.driver.driverType === "FROTA" && !result.driver.currentFleetVehicle ? "/vehicle" : "/home"
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(error instanceof Error ? error.message : "Falha ao entrar no app do motorista.");
    } finally {
      setIsBusy(false);
    }
  }

  if (isRestoringSession) {
    return (
      <SafeAreaView style={styles.restoreScreen} edges={["top", "left", "right"]}>
        <ActivityIndicator color={colors.highlight} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <LoginArtwork compact={compactArtwork} />

          <View style={styles.content}>
            <Text style={styles.heading}>Login</Text>
            <Text style={styles.subtitle}>Bem-vindo de volta! Bora pedir aquela corrida?</Text>

            <View style={styles.form}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>CPF</Text>
                <TextInput
                  ref={cpfInputRef}
                  value={cpf}
                  onChangeText={(value) => setCpf(formatCpfInput(value))}
                  onFocus={() => setActiveField("cpf")}
                  onBlur={() => setActiveField((current) => (current === "cpf" ? null : current))}
                  placeholder="Digite seu CPF"
                  placeholderTextColor="#B3AEAE"
                  keyboardType="number-pad"
                  style={[styles.input, activeField === "cpf" ? styles.inputFocused : null]}
                  maxLength={14}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Senha</Text>
                <Pressable
                  onPress={() => {
                    passwordInputRef.current?.focus();
                  }}
                  style={[styles.passwordField, activeField === "password" ? styles.inputFocused : null]}
                >
                  <TextInput
                    ref={passwordInputRef}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setActiveField("password")}
                    onBlur={() => setActiveField((current) => (current === "password" ? null : current))}
                    placeholder="Digite sua senha"
                    placeholderTextColor="#B3AEAE"
                    secureTextEntry={!isPasswordVisible}
                    style={styles.passwordInput}
                  />
                  <Pressable hitSlop={10} onPress={() => setIsPasswordVisible((current) => !current)}>
                    <EyeIcon visible={isPasswordVisible} />
                  </Pressable>
                </Pressable>
              </View>

              <View style={[styles.statusBox, statusTone === "success" ? styles.statusSuccess : null, statusTone === "error" ? styles.statusError : null]}>
                <Text style={[styles.statusMessage, statusTone === "success" ? styles.statusMessageSuccess : null, statusTone === "error" ? styles.statusMessageError : null]}>
                  {statusMessage}
                </Text>
              </View>

              <Pressable
                style={[styles.primaryButton, !canSubmit ? styles.primaryButtonDisabled : null]}
                onPress={() => void handleLogin()}
                disabled={!canSubmit}
              >
                {isBusy ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonLabel}>Entrar</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.footerCopy}>
              <Text style={styles.footerText}>Ainda nao tem uma conta?</Text>
              <Text style={styles.footerLink}>Solicite cadastro a operacao</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white
  },
  restoreScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32
  },
  content: {
    gap: 18,
    paddingTop: 24
  },
  artwork: {
    position: "relative",
    height: 374,
    marginTop: 18,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#F3F0FF"
  },
  artworkCompact: {
    height: 316
  },
  artworkPurpleShape: {
    position: "absolute",
    left: -24,
    top: -18,
    bottom: -24,
    width: "58%",
    borderTopRightRadius: 220,
    borderBottomRightRadius: 220,
    backgroundColor: "#B9A8F3"
  },
  artworkYellowShape: {
    position: "absolute",
    right: -30,
    top: -18,
    bottom: -24,
    width: "48%",
    borderTopLeftRadius: 220,
    borderBottomLeftRadius: 220,
    backgroundColor: "#FFD863"
  },
  artworkBadge: {
    position: "absolute",
    left: 32,
    top: 88,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.highlight,
    transform: [{ rotate: "-16deg" }]
  },
  artworkBadgeText: {
    color: "#FF9F3E",
    fontSize: 22,
    lineHeight: 24,
    letterSpacing: 5,
    fontFamily: "Poppins_700Bold"
  },
  artworkCard: {
    position: "absolute",
    left: 68,
    right: 58,
    top: 128,
    paddingHorizontal: 22,
    paddingVertical: 22,
    gap: 12,
    borderRadius: 18,
    backgroundColor: colors.white
  },
  artworkField: {
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D8D0FA"
  },
  artworkButton: {
    alignSelf: "center",
    width: 82,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.highlight
  },
  artworkLock: {
    position: "absolute",
    right: 24,
    top: 228,
    width: 58,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#FF8126"
  },
  artworkLockHandle: {
    position: "absolute",
    left: 18,
    top: -24,
    width: 20,
    height: 28,
    borderWidth: 5,
    borderBottomWidth: 0,
    borderColor: "#FF8126",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18
  },
  artworkFingerprint: {
    position: "absolute",
    left: 40,
    bottom: 24
  },
  artworkTopStroke: {
    position: "absolute",
    left: 2,
    top: 30
  },
  artworkBottomStroke: {
    position: "absolute",
    left: 178,
    bottom: 34
  },
  artworkTriangle: {
    position: "absolute",
    right: 66,
    top: 22
  },
  artworkOrangeRing: {
    position: "absolute",
    right: 18,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 5,
    borderColor: "#FF8126"
  },
  heading: {
    color: colors.highlight,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: "Poppins_700Bold"
  },
  subtitle: {
    marginTop: -8,
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins_400Regular",
    maxWidth: 260
  },
  form: {
    gap: 14
  },
  fieldGroup: {
    gap: 8
  },
  label: {
    color: colors.textStrong,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Poppins_600SemiBold"
  },
  input: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E1FF",
    paddingHorizontal: 16,
    color: colors.textStrong,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    backgroundColor: colors.white
  },
  inputFocused: {
    borderColor: colors.highlight,
    shadowColor: "#6B4EEB",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2
  },
  passwordField: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8E1FF",
    paddingLeft: 16,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white
  },
  passwordInput: {
    flex: 1,
    color: colors.textStrong,
    fontSize: 16,
    fontFamily: "Poppins_400Regular"
  },
  statusBox: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F5F2FF"
  },
  statusSuccess: {
    backgroundColor: "#EAFBF1"
  },
  statusError: {
    backgroundColor: "#FFF0F0"
  },
  statusMessage: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_500Medium"
  },
  statusMessageSuccess: {
    color: "#167A47"
  },
  statusMessageError: {
    color: "#C53C3C"
  },
  primaryButton: {
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.highlight
  },
  primaryButtonDisabled: {
    opacity: 0.55
  },
  primaryButtonLabel: {
    color: colors.white,
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "Poppins_700Bold"
  },
  footerCopy: {
    alignItems: "center",
    gap: 2,
    paddingTop: 8
  },
  footerText: {
    color: colors.textStrong,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular"
  },
  footerLink: {
    color: colors.highlight,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold"
  }
});
