import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.js', '*.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Functions stay small and pure (renderer-conventions).
      'max-lines-per-function': [
        'error',
        { max: 60, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['error', 10],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  {
    // The core (src/) must not couple to any backend, transport, or runtime I/O.
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@a2ui/web_core',
              message:
                'Import the pinned spec version: use "@a2ui/web_core/v0_9" (the bare entry resolves to the older v0_8).',
            },
          ],
          patterns: [
            {
              // A module's internal/ is private. Only the module itself reaches it
              // via a './internal/...' import; reaching another module's internal
              // through '../' is forbidden.
              group: ['../**/internal/*', '../**/internal/**'],
              message:
                "internal/ is private to its parent module. Import its public entry instead, or move the helper out of internal/ if it's genuinely shared.",
            },
            {
              group: ['@a2ui/web_core/v0_8', '@a2ui/web_core/v0_8/*'],
              message:
                'This project targets A2UI spec v0.9. Import from "@a2ui/web_core/v0_9".',
            },
            {
              group: [
                '@kuby/*',
                '*kuby*',
                '*trensc*',
                'amqplib',
                '@slack/web-api',
                'fs',
                'node:fs',
                'net',
                'node:net',
              ],
              message:
                'The core (src/) is pure and decoupled. Backend/transport/IO belongs in examples/.',
            },
          ],
        },
      ],
    },
  },
  {
    // Tests may use any/long bodies for fixtures and table-driven cases.
    files: ['**/*.test.ts', 'test/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'examples/', 'coverage/', '.stryker-tmp/'],
  },
];
