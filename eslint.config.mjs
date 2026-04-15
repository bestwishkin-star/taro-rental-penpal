import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const tsFiles = ['**/*.{ts,tsx,mts,cts}'];

export default tseslint.config(
  {
    ignores: [
      '**/.next/**',
      '**/.taro/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
      'apps/frontend/vitest.config.ts'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: tsFiles,
    languageOptions: {
      parserOptions: {
        project: [
          './apps/frontend/tsconfig.json',
          './apps/backend/tsconfig.json',
          './packages/shared/tsconfig.json'
        ],
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      import: importPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin
    },
    rules: {
      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          },
          'newlines-between': 'always',
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index'
          ],
          pathGroups: [
            {
              pattern: '@shared/**',
              group: 'internal',
              position: 'before'
            },
            {
              pattern: '@/**',
              group: 'internal'
            }
          ],
          pathGroupsExcludedImportTypes: ['builtin', 'external', 'object']
        }
      ],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off'
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['apps/backend/**/*.{ts,tsx}'],
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules
    }
  },
  eslintConfigPrettier
);
