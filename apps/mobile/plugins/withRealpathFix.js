/**
 * Expo config plugin that fixes the macOS /var -> /private/var symlink issue
 * in EAS local builds.
 *
 * When EAS extracts the build tarball to /var/folders/..., Xcode's PROJECT_DIR
 * uses the symlinked path (/var/...) but Metro resolves its project root to
 * the real path (/private/var/...). path.relative() between these two prefixes
 * produces broken ../../ chains instead of a simple relative path.
 *
 * This plugin prepends a line to the "Bundle React Native code and images"
 * Xcode build phase that normalizes PROJECT_DIR using `pwd -P` (physical
 * path with symlinks resolved), so all downstream paths are consistent.
 */
const { withXcodeProject } = require('@expo/config-plugins');

const PATCH_COMMENT = '# [CFB Social] Resolve /var symlink for Metro bundler';
const PATCH_LINE = 'export PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd -P)"';

module.exports = function withRealpathFix(config) {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const nativeTargets = project.pbxNativeTargetSection();

    for (const uuid in nativeTargets) {
      const target = nativeTargets[uuid];
      if (typeof target !== 'object' || target.isa !== 'PBXNativeTarget') continue;

      const buildPhases = target.buildPhases || [];
      for (const phase of buildPhases) {
        const phaseObj = project.hash.project.objects.PBXShellScriptBuildPhase?.[phase.value];
        if (!phaseObj) continue;

        const name = phaseObj.name || '';
        if (!name.includes('Bundle React Native code and images')) continue;

        let script = phaseObj.shellScript || '';
        // Remove outer quotes if present
        if (script.startsWith('"') && script.endsWith('"')) {
          script = script.slice(1, -1);
        }

        // Don't patch twice
        if (script.includes(PATCH_COMMENT)) {
          console.log('[withRealpathFix] Already patched, skipping');
          continue;
        }

        // Prepend the symlink fix
        const patch = `${PATCH_COMMENT}\\n${PATCH_LINE}\\n`;
        script = patch + script;

        phaseObj.shellScript = `"${script}"`;
        console.log('[withRealpathFix] Patched "Bundle React Native code and images" build phase');
      }
    }

    return config;
  });
};
