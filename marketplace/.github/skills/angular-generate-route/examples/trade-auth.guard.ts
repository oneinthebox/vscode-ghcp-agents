// Example output from /angular-generate-route — see SKILL.md for usage
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

/**
 * Functional route guard for trade routes.
 * Redirects unauthenticated users to /login with a return URL.
 */
export const tradeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: '/trade' },
  });
};
