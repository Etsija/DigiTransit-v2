/// <reference types="jest" />

import { ClientError } from 'graphql-request';

import { getRetryDelay, shouldRetry } from '@/core/api/query-client';

function createClientError(status: number) {
  return new ClientError(
    {
      status,
      headers: new Headers(),
      body: '',
    },
    {
      query: 'query Test { test }',
      variables: undefined,
    }
  );
}

describe('query client retry policy', () => {
  it('uses exponential backoff for generic retryable failures', () => {
    expect(getRetryDelay(0, new Error('fetch failed'))).toBe(1000);
    expect(getRetryDelay(1, new Error('fetch failed'))).toBe(2000);
    expect(getRetryDelay(5, new Error('fetch failed'))).toBe(30000);
  });

  it('uses a minimum 30 second delay for 403 responses', () => {
    expect(getRetryDelay(0, createClientError(403))).toBe(30000);
  });

  it('retries 403 responses up to the configured limit', () => {
    expect(shouldRetry(0, createClientError(403))).toBe(true);
    expect(shouldRetry(2, createClientError(403))).toBe(true);
    expect(shouldRetry(3, createClientError(403))).toBe(false);
  });

  it('does not retry other 4xx client errors', () => {
    expect(shouldRetry(0, createClientError(404))).toBe(false);
  });
});
