/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testMatch: ["**/__tests__/**/*.ts"],
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  // moduleNameMapper: {
  //   "^(\\.{1,2}/.*)\\.js$": "$1",
  // },
  // transform: {
  //   "^.+\\.ts?$": [
  //     "ts-jest",
  //     {
  //       useESM: true,
  //       // Other ts-jest specific configurations go here...
  //     },
  //   ],
  // },
};
