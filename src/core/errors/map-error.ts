import type { GraphQLError } from 'graphql';

export { mapToAppError, type AppError, type AppErrorKind } from '@/core/errors/app-error';

type GraphQLErrorLike = Pick<GraphQLError, 'message'>;

export function getGraphQLErrorMessage(
  errors: readonly GraphQLErrorLike[] | undefined
): string | undefined {
  if (!errors || errors.length === 0) {
    return undefined;
  }

  return errors.map((error) => error.message).join('; ');
}
