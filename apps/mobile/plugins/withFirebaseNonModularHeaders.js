// Expo config plugin: enable modular headers for the Obj-C Firebase pods
// that Swift Firebase pods depend on.
//
// @react-native-firebase v22+ pulls in Swift pods (e.g. FirebaseCoreInternal)
// that depend on Obj-C pods like GoogleUtilities. Without module maps, pod
// install fails with:
//
//   The Swift pod `FirebaseCoreInternal` depends upon `GoogleUtilities`,
//   which does not define modules.
//
// We must NOT use `use_modular_headers!` globally — it breaks ExpoModulesCore's
// Swift 6 / `static_framework = true` configuration. Likewise, we avoid
// `useFrameworks: "static"` in expo-build-properties because it creates
// strict module-boundary errors in @react-native-firebase Obj-C code under
// Xcode 16. Instead we add modular_headers selectively to the Obj-C pods
// the Swift Firebase code needs to import.
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# >>> firebase-modular-headers";
const POD_NAMES = [
  "GoogleUtilities",
  "FirebaseCore",
  "FirebaseCoreExtension",
  "FirebaseInstallations",
  "GoogleDataTransport",
  "nanopb",
];

function patchPodfile(contents) {
  if (contents.includes(MARKER)) return contents;

  const podLines = POD_NAMES.map(
    (name) => `  pod '${name}', :modular_headers => true`
  ).join("\n");
  const inject = `\n  ${MARKER}\n${podLines}\n  # <<< firebase-modular-headers\n`;

  // Inject inside the main app target. Expo generates `target 'AppName' do`.
  const targetMatch = contents.match(/(target\s+['"][^'"]+['"]\s+do\s*\n)/);
  if (!targetMatch) {
    throw new Error(
      "withFirebaseNonModularHeaders: could not find a `target ... do` block in Podfile"
    );
  }

  return contents.replace(targetMatch[1], `${targetMatch[1]}${inject}`);
}

module.exports = function withFirebaseNonModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile"
      );
      const before = fs.readFileSync(podfilePath, "utf8");
      const after = patchPodfile(before);
      if (before !== after) fs.writeFileSync(podfilePath, after);
      return cfg;
    },
  ]);
};
