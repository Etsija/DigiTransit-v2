/// <reference types="jest" />

import { ClientError } from 'graphql-request';

import { mapToAppError } from '@/core/errors/app-error';

describe('mapToAppError', () => {
  it('maps 401 GraphQL client errors to permission failures', () => {
    const error = new ClientError(
      { status: 401, errors: undefined } as any,
      { query: 'query Test { ping }' } as any
    );

    expect(mapToAppError(error)).toMatchObject({
      kind: 'permission',
      message: 'DigiTransit API access was rejected.',
      retryable: false,
    });
  });
});
