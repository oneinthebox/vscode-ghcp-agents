// Example input for /angular-migrate-signals — see SKILL.md for usage
// BEFORE: uses legacy @Input/@Output decorators, BehaviorSubject, and takeUntil
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PortfolioService } from '@core/services/portfolio.service';
import { Holding } from '@shared/models/holding.model';

@Component({
  selector: 'app-portfolio',
  // template uses async pipe: {{ totalValue$ | async | currency }}
  // template uses *ngIf: *ngIf="holdings$ | async as holdings"
  templateUrl: './portfolio.component.html',
})
export class PortfolioComponent implements OnInit, OnDestroy {
  @Input() accountId!: string;
  @Input() currency: string = 'USD';
  @Output() holdingSelected = new EventEmitter<Holding>();

  private readonly destroy$ = new Subject<void>();
  readonly holdings$ = new BehaviorSubject<Holding[]>([]);
  readonly totalValue$ = new BehaviorSubject<number>(0);
  readonly loading$ = new BehaviorSubject<boolean>(false);

  constructor(private readonly portfolioService: PortfolioService) {}

  ngOnInit(): void {
    this.loading$.next(true);
    this.portfolioService
      .getHoldings(this.accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (holdings) => {
          this.holdings$.next(holdings);
          this.totalValue$.next(
            holdings.reduce((sum, h) => sum + h.marketValue, 0)
          );
          this.loading$.next(false);
        },
        error: () => this.loading$.next(false),
      });
  }

  selectHolding(holding: Holding): void {
    this.holdingSelected.emit(holding);
  }

  refreshPortfolio(): void {
    this.loading$.next(true);
    this.portfolioService
      .getHoldings(this.accountId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (holdings) => {
          this.holdings$.next(holdings);
          this.totalValue$.next(
            holdings.reduce((sum, h) => sum + h.marketValue, 0)
          );
          this.loading$.next(false);
        },
        error: () => this.loading$.next(false),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
