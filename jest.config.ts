import { getJestProjectsAsync } from '@nx/jest';

export default async () => ({
  // projects: await getJestProjectsAsync(),
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
});
