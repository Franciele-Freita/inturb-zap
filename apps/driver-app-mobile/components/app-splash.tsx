import { StyleSheet, View } from "react-native";
import { BrandLogo } from "./brand-logo";
import { colors } from "../theme/tokens";

export function AppSplash() {
  return (
    <View style={styles.container}>
      <BrandLogo width={182} height={42} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.highlight
  }
});
