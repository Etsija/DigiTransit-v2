import { ClientError } from 'graphql-request';

export type AppErrorKind = 'network' | 'graphql' | 'permission' | 'empty' | 'unknown';

export interface AppError {
  kind: AppErrorKind;
  message: string;
  retryable: boolean;
  cause?: unknown;
}

export function getAppErrorMessage(
  error: AppError | Error | null | undefined,
  fallback = 'DigiTransit API unavailable'
): string {
  if (!error?.message) {
    return fallback;
  }

  return error.message;
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

function formatClientErrorStatus(error: ClientError): string {
  return typeof error.response.status === 'number' ? `HTTP ${error.response.status}` : 'HTTP error';
}

function getResponseText(error: ClientError): string | undefined {
  const responseData = error.response as { data?: unknown } | undefined;

  if (typeof responseData?.data === 'string' && responseData.data.trim().length > 0) {
    return responseData.data.trim();
  }

  return undefined;
}

export function mapToAppError(error: unknown): AppError {
  if (error instanceof ClientError) {
    const statusLabel = formatClientErrorStatus(error);
    const graphQLErrorMessage = getGraphQLErrorMessage(error);
    const responseText = getResponseText(error);

    if (error.response.status === 401 || error.response.status === 403) {
      return {
        kind: 'permission',
        message: [
          statusLabel,
          graphQLErrorMessage ?? responseText ?? 'DigiTransit API access was rejected.',
        ].join(': '),
        retryable: false,
        cause: error,
      };
    }

    if (graphQLErrorMessage) {
      return {
        kind: 'graphql',
        message: `${statusLabel}: ${graphQLErrorMessage}`,
        retryable: false,
        cause: error,
      };
    }

    if (error.response.status >= 500) {
      return {
        kind: 'network',
        message: `${statusLabel}: ${responseText ?? 'DigiTransit API request failed.'}`,
        retryable: true,
        cause: error,
      };
    }

    return {
      kind: 'unknown',
      message: `${statusLabel}: ${responseText ?? 'DigiTransit API request failed.'}`,
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
