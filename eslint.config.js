// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

/**
 * ESLint 설정 (flat config).
 * - typescript-eslint 권장 규칙 + React Hooks 규칙
 * - eslint-config-prettier를 마지막에 두어 포맷 관련 규칙 충돌 제거
 *   (포맷은 Prettier가, 코드 품질은 ESLint가 담당하도록 역할 분리)
 */
export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        confirm: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        structuredClone: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        ScrollBehavior: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // 미사용 변수는 경고, _ 접두는 의도적 미사용으로 허용
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // 테스트 파일: 노드 전역 허용
  {
    files: ['**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: { global: 'readonly' },
    },
  },
  prettier,
);
