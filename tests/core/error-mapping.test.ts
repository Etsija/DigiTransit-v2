/// <reference types="jest" />

import type { GraphQLError } from 'graphql';
import { ClientError } from 'graphql-request';

import { mapToAppError } from '@/core/errors/app-error';

function createClientError(options: { status: number; errors?: Array<{ message: string }> }) {
  return new ClientError(
    {
      status: options.status,
      headers: new Headers(),
      body: '',
      errors: options.errors as GraphQLError[] | undefined,
    },
    {
      query: 'query Test { test }',
      variables: undefined,
    }
  );
}

describe('mapToAppError', () => {
  it('maps network errors as retryable network failures', () => {
    expect(mapToAppError(new Error('fetch failed'))).toMatchObject({
      kind: 'network',
      retryable: true,
    });
  });

  it('maps GraphQL client errors with response errors', () => {
    expect(
      mapToAppError(createClientError({ status: 200, errors: [{ message: 'Invalid query' }] }))
    ).toMatchObject({
      kind: 'graphql',
      message: 'Invalid query',
      retryable: false,
    });
  });

  it('maps unknown thrown values', () => {
    expect(mapToAppError('boom')).toMatchObject({
      kind: 'unknown',
      retryable: false,
    });
  });
});
