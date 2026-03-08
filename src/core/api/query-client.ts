import { QueryClient } from '@tanstack/react-query';
import { ClientError } from 'graphql-request';

import { mapToAppError } from '@/core/errors/app-error';

const MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 30_000;

function isRateLimited(error: unknown): boolean {
  return error instanceof ClientError && error.response.status === 403;
}

function isRetryableClientError(error: unknown): boolean {
  if (!(error instanceof ClientError)) {
    return false;
  }

  return error.response.status >= 500;
}

export function getRetryDelay(attemptIndex: number, error: unknown): number {
  if (isRateLimited(error)) {
    return MAX_BACKOFF_MS;
  }

  return Math.min(1000 * 2 ** attemptIndex, MAX_BACKOFF_MS);
}

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isRateLimited(error)) {
    return failureCount < MAX_RETRIES;
  }

  if (error instanceof ClientError) {
    if (isRetryableClientError(error)) {
      return failureCount < MAX_RETRIES;
    }

    return false;
  }

  return mapToAppError(error).retryable && failureCount < MAX_RETRIES;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay: getRetryDelay,
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  },
});
