// Canonical Expo default config files, copied verbatim from
// @expo/cli/static/template. When a repro's config matches one of these it's a
// pristine default — safe to leave alone, so we don't flag or remove it.
//
// Each filename maps to a list of known-good contents so new SDK variants can be
// appended over time without touching the matching logic.
const TEMPLATES: Record<string, string[]> = {
  'babel.config.js': [
    `module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};`,
  ],
  'metro.config.js': [
    `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;`,
  ],
  '.eslintrc.js': [
    `// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*'],
};`,
  ],
  'eslint.config.js': [
    `// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);`,
  ],
};

// Ignore line-ending and surrounding-whitespace differences so a byte-for-byte
// identical config still matches after an editor rewraps or adds a trailing newline.
const normalize = (content: string): string => content.replace(/\r\n/g, '\n').trim();

export function isPristineExpoTemplate(filename: string, content: string): boolean {
  const variants = TEMPLATES[filename];
  if (!variants) {
    return false;
  }
  const normalized = normalize(content);
  return variants.some((variant) => normalize(variant) === normalized);
}
