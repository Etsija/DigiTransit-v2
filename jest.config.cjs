module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest-setup.ts'],
  moduleNameMapper: {
    '^@/global\\.css$': '<rootDir>/tests/setup/style-mock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css)$': '<rootDir>/tests/setup/style-mock.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/src/generated/', '/_bmad-output/'],
};
