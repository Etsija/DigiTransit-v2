import { ClientError } from 'graphql-request';

export type AppErrorKind = 'network' | 'graphql' | 'permission' | 'empty' | 'unknown';

export interface AppError {
  kind: AppErrorKind;
  message: string;
  retryable: boolean;
  cause?: unknown;
}

function isNetworkMessage(message: string): boolean {
  return /fetch failed|network|timed out|timeout|socket|dns|eai_again|offline/i.test(message);
}

function getGraphQLErrorMessage(error: ClientError): string | undefined {
  if (!error.response.errors || error.response.errors.length === 0) {
    return undefined;
  }

  return error.response.errors.map((item) => item.message).join('; ');
}

export function mapToAppError(error: unknown): AppError {
  if (error instanceof ClientError) {
    if (error.response.status === 401 || error.response.status === 403) {
      return {
        kind: 'permission',
        message: 'DigiTransit API access was rejected.',
        retryable: false,
        cause: error,
      };
    }

    const graphQLErrorMessage = getGraphQLErrorMessage(error);

    if (graphQLErrorMessage) {
      return {
        kind: 'graphql',
        message: graphQLErrorMessage,
        retryable: false,
        cause: error,
      };
    }

    if (error.response.status >= 500) {
      return {
        kind: 'network',
        message: `DigiTransit API request failed with status ${error.response.status}.`,
        retryable: true,
        cause: error,
      };
    }

    return {
      kind: 'unknown',
      message: `DigiTransit API request failed with status ${error.response.status}.`,
      retryable: false,
      cause: error,
    };
  }

  if (error instanceof Error) {
    if (isNetworkMessage(error.message)) {
      return {
        kind: 'network',
        message: error.message,
        retryable: true,
        cause: error,
      };
    }

    return {
      kind: 'unknown',
      message: error.message,
      retryable: false,
      cause: error,
    };
  }

  return {
    kind: 'unknown',
    message: 'An unknown error occurred.',
    retryable: false,
    cause: error,
  };
}
