module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script', // CommonJS
  },
  extends: ['eslint:recommended'],
  rules: {
    'linebreak-style': 0,
    'require-jsdoc': 'off',
    'valid-jsdoc': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'max-len': [
      'warn',
      {
        code: 120,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreComments: true,
      },
    ],
    quotes: ['error', 'single', { avoidEscape: true }],
    indent: ['error', 2, { SwitchCase: 1 }],
    strict: ['warn', 'never'], // remove the warning about "use strict"
  },
  globals: {
    fetch: 'readonly',
    Request: 'readonly',
    Response: 'readonly',
    URL: 'readonly',
  },
};
