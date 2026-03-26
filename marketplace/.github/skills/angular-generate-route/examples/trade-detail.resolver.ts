// Example output from /angular-generate-route — see SKILL.md for usage
import { inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { TradeService } from '@core/services/trade.service';
import { LoggingService } from '@core/services/logging.service';
import { TradeDetail } from '@shared/models/trade.model';
import { catchError, of } from 'rxjs';

/**
 * Resolves trade detail data before the route activates.
 * Returns null on failure so the component can display an error state.
 */
export const tradeDetailResolver: ResolveFn<TradeDetail | null> = (
  route: ActivatedRouteSnapshot
) => {
  const tradeService = inject(TradeService);
  const logger = inject(LoggingService);
  const tradeId = route.paramMap.get('id') ?? '';

  logger.info('TradeDetailResolver', `Resolving detail for tradeId=${tradeId}`);

  return tradeService.getById(tradeId).pipe(
    catchError((err) => {
      logger.error('TradeDetailResolver', `Failed to resolve: ${err.message}`);
      return of(null);
    }),
  );
};
