/**
 * Expo config plugin that disables Swift strict concurrency checking
 * for all CocoaPods targets AND the project itself.
 *
 * Key fix: injects settings AFTER the react_native_post_install() call
 * (including its closing parenthesis) so the code lives outside the
 * function call and doesn't cause Ruby syntax errors.
 *
 * NOTE: We do NOT override SWIFT_VERSION — expo-modules-core SDK 55
 * uses Swift 6 syntax (@MainActor on protocol conformances) which
 * requires the default Swift version from Xcode. We only set
 * SWIFT_STRICT_CONCURRENCY to 'minimal' to suppress concurrency warnings.
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

      const makeSnippet = (varName) => [
        '',
        '    # [CFB Social] Disable strict concurrency checking (Xcode 16+)',
        `    ${varName}.pods_project.build_configurations.each do |bc|`,
        `      bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'`,
        '    end',
        `    ${varName}.pods_project.targets.each do |target|`,
        '      target.build_configurations.each do |bc|',
        `        bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'`,
        '      end',
        '    end',
      ].join('\n');

      // Figure out the installer variable name from the post_install block
      const postInstallMatch = contents.match(/post_install\s+do\s+\|(\w+)\|/);
      const varName = postInstallMatch ? postInstallMatch[1] : 'installer';
      const snippet = makeSnippet(varName);

      // Strategy 1: Find react_native_post_install() and inject AFTER its closing paren
      const lines = contents.split('\n');
      const rnLineIdx = lines.findIndex(l => l.includes('react_native_post_install'));

      if (rnLineIdx !== -1) {
        // Track parenthesis depth to find the closing ) of this multi-line call
        let depth = 0;
        let closingIdx = rnLineIdx;
        for (let i = rnLineIdx; i < lines.length; i++) {
          for (const ch of lines[i]) {
            if (ch === '(') depth++;
            if (ch === ')') depth--;
          }
          if (depth <= 0) {
            closingIdx = i;
            break;
          }
        }

        // Insert snippet after the closing paren line
        const snippetLines = snippet.split('\n');
        lines.splice(closingIdx + 1, 0, ...snippetLines);
        contents = lines.join('\n');

        console.log(
          `[withSwiftConcurrencyMinimal] Injected SWIFT_STRICT_CONCURRENCY=minimal AFTER react_native_post_install (closing paren at line ${closingIdx + 1})`
        );
      } else if (postInstallMatch) {
        // Strategy 2: No react_native_post_install found, inject at start of post_install
        contents = contents.replace(
          /post_install\s+do\s+\|(\w+)\|/,
          `post_install do |${varName}|${snippet}`
        );
        console.log(
          '[withSwiftConcurrencyMinimal] Injected at START of post_install (no react_native_post_install found)'
        );
      } else {
        // Strategy 3: No post_install at all — append one
        contents += [
          '',
          '# [CFB Social] Disable strict concurrency (Xcode 16+)',
          'post_install do |installer|',
          makeSnippet('installer'),
          'end',
          '',
        ].join('\n');
        console.log(
          '[withSwiftConcurrencyMinimal] Appended new post_install block'
        );
      }

      // Log the Podfile for debugging
      const finalLines = contents.split('\n');
      console.log('[withSwiftConcurrencyMinimal] === Podfile post_install section ===');
      const postInstallIdx = finalLines.findIndex(l => l.match(/post_install/));
      if (postInstallIdx !== -1) {
        const slice = finalLines.slice(postInstallIdx, Math.min(postInstallIdx + 30, finalLines.length));
        console.log(slice.join('\n'));
      }
      console.log('[withSwiftConcurrencyMinimal] === End Podfile section ===');

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
