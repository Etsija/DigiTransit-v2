import type { RequestDocument, TypedDocumentString, Variables } from 'graphql-request';
import { GraphQLClient } from 'graphql-request';

import { DIGITRANSIT_API_KEY, DIGITRANSIT_API_URL } from '@/core/config/env';
import { mapToAppError, type AppError } from '@/core/errors/app-error';

export const graphqlClient = new GraphQLClient(DIGITRANSIT_API_URL, {
  headers: {
    'digitransit-subscription-key': DIGITRANSIT_API_KEY,
  },
});

export async function requestGraphql<TResult, TVariables extends Variables = Variables>(
  document: RequestDocument | TypedDocumentString<TResult, TVariables>,
  variables?: TVariables
): Promise<TResult> {
  try {
    const requestArgs = variables ? [document, variables] : [document];

    return await (graphqlClient.request as (...args: unknown[]) => Promise<TResult>)(...requestArgs);
  } catch (error) {
    throw mapToAppError(error) satisfies AppError;
  }
}
