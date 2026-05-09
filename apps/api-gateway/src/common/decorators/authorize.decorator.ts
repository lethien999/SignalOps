import { SetMetadata } from '@nestjs/common';

export const AUTHORIZE_KEY = 'authorize_role';

/**
 * Decorator to specify required role for a route
 * @param role - Single role or array of roles
 * @example
 * @Authorize('admin')
 * @Authorize(['admin', 'editor'])
 */
export const Authorize = (role?: string | string[]) => SetMetadata(AUTHORIZE_KEY, role);
