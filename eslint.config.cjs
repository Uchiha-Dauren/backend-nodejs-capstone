const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['**/node_modules/**', '**/build/**', '**/coverage/**']
  },
  {
    files: [
      'secondChance-backend/**/*.js',
      'sentiment/**/*.js',
      'scripts/**/*.{js,cjs}',
      'tests/**/*.{js,cjs}',
      'eslint.config.cjs'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node
    },
    rules: {
      ...js.configs.recommended.rules,
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_'
      }]
    }
  }
];
