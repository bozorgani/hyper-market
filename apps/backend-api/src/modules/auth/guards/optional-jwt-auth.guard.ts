import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalJwtAuthGuard - Allows requests to proceed even without authentication
 * 
 * This guard attempts to authenticate the user, but if authentication fails,
 * the request continues with req.user = undefined instead of throwing an error.
 * 
 * Use cases:
 * - Endpoints that have different behavior for authenticated vs unauthenticated users
 * - Public endpoints that can optionally use user data if available
 * - Tracking/analytics endpoints
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Return user if authenticated, or undefined if not
    // Don't throw error on authentication failure
    return user;
  }
}
