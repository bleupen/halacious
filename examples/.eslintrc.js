'use strict';

// ESLint configuration
// http://eslint.org/docs/user-guide/configuring
module.exports = {
  rules: {
    'import/no-unresolved': [2, { ignore: ['halacious'] }],
    'import/no-extraneous-dependencies': 'off', // warnings re: devDependencies
    'no-console': 'off',
    'node/no-missing-require': [2, { allowModules: ['halacious'] }]
  }
};
