import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { CodegenConfig } from '@graphql-codegen/cli';

type ProcessLike = {
  env?: Record<string, string | undefined>;
  loadEnvFile?: (path?: string) => void;
};

const processRef = (globalThis as { process?: ProcessLike }).process;

loadEnv('.env');

function loadEnv(path: string): void {
  processRef?.loadEnvFile?.(path);

  if (!processRef?.env || processRef.env.EXPO_PUBLIC_DIGITRANSIT_API_KEY) {
    return;
  }

  const envPath = resolve(path);

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    processRef.env[key] ??= value;
  }
}

const DIGITRANSIT_API_URL =
  processRef?.env?.EXPO_PUBLIC_DIGITRANSIT_API_URL ??
  'https://api.digitransit.fi/routing/v2/varely/gtfs/v1';

const DIGITRANSIT_API_KEY = processRef?.env?.EXPO_PUBLIC_DIGITRANSIT_API_KEY ?? '';

const config: CodegenConfig = {
  schema: {
    [DIGITRANSIT_API_URL]: {
      headers: {
        'digitransit-subscription-key': DIGITRANSIT_API_KEY,
      },
    },
  },
  documents: ['src/**/*.graphql'],
  generates: {
    'src/generated/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
      },
    },
  },
};

export default config;
