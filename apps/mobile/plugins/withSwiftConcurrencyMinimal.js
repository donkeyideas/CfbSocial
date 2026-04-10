/**
 * Expo config plugin that sets SWIFT_STRICT_CONCURRENCY to "minimal"
 * for all CocoaPods targets AND the project itself.
 * Fixes Xcode 16+ / Swift 6 build errors in expo-modules-core,
 * react-native-safe-area-context, and other native modules.
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

      const snippet = [
        '',
        '    # [CFB Social] Disable Swift strict concurrency for Xcode 16+',
        '    installer.pods_project.build_configurations.each do |bc|',
        "      bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
        '    end',
        '    installer.pods_project.targets.each do |target|',
        '      target.build_configurations.each do |bc|',
        "        bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
        '      end',
        '    end',
      ].join('\n');

      // Try flexible regex to find any post_install block
      const postInstallRegex = /post_install\s+do\s+\|(\w+)\|/;
      const match = contents.match(postInstallRegex);

      if (match) {
        const varName = match[1];
        // Replace 'installer' in snippet with actual variable name
        const fixedSnippet = snippet.replace(/installer/g, varName);
        contents = contents.replace(
          postInstallRegex,
          `post_install do |${varName}|${fixedSnippet}`
        );
        console.log('[withSwiftConcurrencyMinimal] Injected SWIFT_STRICT_CONCURRENCY=minimal into post_install block');
      } else {
        // No post_install found — append one at end of file
        contents += [
          '',
          '# [CFB Social] Disable Swift strict concurrency for Xcode 16+',
          'post_install do |installer|',
          '  installer.pods_project.build_configurations.each do |bc|',
          "    bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
          '  end',
          '  installer.pods_project.targets.each do |target|',
          '    target.build_configurations.each do |bc|',
          "      bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'",
          '    end',
          '  end',
          'end',
          '',
        ].join('\n');
        console.log('[withSwiftConcurrencyMinimal] Appended new post_install block with SWIFT_STRICT_CONCURRENCY=minimal');
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
