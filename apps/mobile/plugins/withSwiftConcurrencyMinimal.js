/**
 * Expo config plugin that sets SWIFT_STRICT_CONCURRENCY to "minimal"
 * for all CocoaPods targets. This fixes Xcode 16+ / Swift 5.10+ build
 * errors in React Native native modules (react-native-safe-area-context, etc).
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withSwiftConcurrencyMinimal(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      let contents = fs.readFileSync(podfilePath, 'utf8');

      const snippet = `
    # Disable Swift strict concurrency (fixes Xcode 16+ build errors in RN modules)
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      end
    end`;

      // Inject into the existing post_install block
      contents = contents.replace(
        /post_install do \|installer\|/,
        `post_install do |installer|${snippet}`
      );

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
