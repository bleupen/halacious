/**
 * React Starter Kit (https://www.reactstarterkit.com/)
 *
 * Copyright © 2014-present Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

// ESLint configuration
// http://eslint.org/docs/user-guide/configuring
module.exports = {
  parserOptions: {
    ecmaVersion: 2017,
  },

  extends: ['airbnb-base', 'prettier', 'plugin:node/recommended'],

  plugins: ['prettier', 'node', 'mocha'],

  globals: {
    __DEV__: true,
  },

  env: {
    browser: true,
    es6: true,
    node: true,
  },

  rules: {
    // TODO: Update code and re-enable rules.
    'global-require': 'off',
    'func-names': 'off',
    'prefer-const': 'off',

    // Not supporting nested package.json yet
    // https://github.com/benmosher/eslint-plugin-import/issues/458
    'import/no-extraneous-dependencies': 'off',

    'import/extensions': [
      'error',
      'never',
      { packages: 'always', json: 'always' },
    ],

    // Recommend not to leave any console.log in your code
    // Use console.error, console.warn and console.info instead
    'no-console': [
      'error',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],

    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],

    // Allow HAL properties
    'no-underscore-dangle': ['error', { allow: ['_embedded', '_links'] }],

    'node/no-unpublished-require': 'off',

    'node/no-unsupported-features': [
      'error',
      {
        version: 8,
        ignores: [],
      },
    ],

    // ESLint plugin for prettier formatting
    // https://github.com/prettier/eslint-plugin-prettier
    'prettier/prettier': [
      'error',
      {
        // https://github.com/prettier/prettier#options
        singleQuote: true,
        trailingComma: 'es5',
      },
    ],
  },

  settings: {
    // Allow absolute paths in imports, e.g. import Button from 'components/Button'
    // https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', 'data', 'handlers'],
      },
    },
  },
};
