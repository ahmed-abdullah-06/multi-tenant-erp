module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'server/src/**/*.js',
    '!server/src/server.js', // Exclude the main listener
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  verbose: true
};