module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      // Citizen Domain: NEVER import from Arogya Sevak
      files: ['src/citizen/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@sevak/*', '../arogya-sevak/*', '../../arogya-sevak/*'],
                message:
                  'BOUNDARY VIOLATION: Citizen domain code must NOT import from Arogya Sevak domain. Keep personas strictly decoupled.',
              },
            ],
          },
        ],
      },
    },
    {
      // Arogya Sevak Domain: NEVER import from Citizen
      files: ['src/arogya-sevak/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@citizen/*', '../citizen/*', '../../citizen/*'],
                message:
                  'BOUNDARY VIOLATION: Arogya Sevak domain code must NOT import from Citizen domain. Keep personas strictly decoupled.',
              },
            ],
          },
        ],
      },
    },
  ],
};
