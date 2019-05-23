'use strict';

// ESLint configuration
// http://eslint.org/docs/user-guide/configuring
module.exports = {
  extends: ['../.eslintrc.js'],

  env: {
    node: true,
    mocha: true
  },

  rules: {
    'import/no-unresolved': [2, { ignore: ['halacious'] }],
    // TODO: Update Chai should syntax
    'no-unused-expressions': 'off',
    'node/no-missing-require': [2, { allowModules: ['halacious'] }]
  },

  overrides: [
    {
      files: ['representation-spec.js'],
      rules: {
        'no-underscore-dangle': 'off'
      }
    }
  ]
};
