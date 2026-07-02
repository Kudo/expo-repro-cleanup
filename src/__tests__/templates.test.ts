import { describe, expect, it } from 'vitest';

import { isPristineExpoTemplate } from '../templates.js';

const PRISTINE_BABEL = `module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};`;

describe('isPristineExpoTemplate', () => {
  it('should match the exact pristine content', () => {
    expect(isPristineExpoTemplate('babel.config.js', PRISTINE_BABEL)).toBe(true);
  });

  it('should match content with a trailing newline', () => {
    expect(isPristineExpoTemplate('babel.config.js', `${PRISTINE_BABEL}\n`)).toBe(true);
  });

  it('should match content with CRLF line endings', () => {
    expect(isPristineExpoTemplate('babel.config.js', PRISTINE_BABEL.replace(/\n/g, '\r\n'))).toBe(
      true
    );
  });

  it('should match a pristine flat eslint config', () => {
    const eslint = `// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);`;
    expect(isPristineExpoTemplate('eslint.config.js', eslint)).toBe(true);
  });

  it('should not match customized content', () => {
    const customized = PRISTINE_BABEL.replace(
      `presets: ['babel-preset-expo'],`,
      `presets: ['babel-preset-expo'],\n    plugins: ['react-native-reanimated/plugin'],`
    );
    expect(isPristineExpoTemplate('babel.config.js', customized)).toBe(false);
  });

  it('should not match a filename without a known template', () => {
    expect(isPristineExpoTemplate('tsconfig.json', '{ "extends": "expo/tsconfig.base" }')).toBe(
      false
    );
  });
});
