const base = require('@hss/eslint-config');

module.exports = [
  ...base,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
