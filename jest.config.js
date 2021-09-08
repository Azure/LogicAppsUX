module.exports = {
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  transform: {
    "^.+\\.jsx?$": "babel-jest",
    "^.+\\.(ts|tsx)$": "ts-jest",
    "^.+\\.(css|less)$": "./__mocks__/styleMock.js",
    "^.+\\.svg$": "./__mocks__/svgTransform.js"
  },
  transformIgnorePatterns: ["<roodDir>/node_modules/(?!@fluentui)"],
  testResultsProcessor: "jest-junit",
};
