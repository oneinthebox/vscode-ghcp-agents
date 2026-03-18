import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TradingService } from '@fintech/data-access';
import {
  Order,
  OrderSide,
  OrderType,
  TimeInForce,
  OrderEntryForm,
} from '@fintech/shared-models';

/**
 * OrderEntryComponent — intentionally uses OLD patterns:
 * - NOT standalone (declared in OrderEntryModule)
 * - Constructor injection instead of inject()
 * - Manual subscription management
 * - Template uses *ngIf instead of @if
 *
 * An ORCH migration tool should flag all of these.
 */
@Component({
  selector: 'app-order-entry',
  templateUrl: './order-entry.component.html',
})
export class OrderEntryComponent implements OnInit, OnDestroy {
  orderForm!: FormGroup;
  recentOrders: Order[] = [];
  isSubmitting = false;
  submitSuccess = false;
  submitError = '';

  sides: OrderSide[] = ['BUY', 'SELL', 'SHORT', 'COVER'];
  orderTypes: OrderType[] = ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'MOC', 'LOC'];
  timeInForces: TimeInForce[] = ['DAY', 'GTC', 'IOC', 'FOK', 'GTD'];

  tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'JPM', 'V', 'JNJ', 'UNH', 'PG',
             'META', 'TSLA', 'XOM', 'BAC', 'MA', 'HD', 'PFE', 'ASML', 'CRM', 'AVGO'];

  private subscriptions: Subscription[] = [];

  // OLD pattern: constructor injection instead of inject()
  constructor(
    private readonly fb: FormBuilder,
    private readonly tradingService: TradingService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadRecentOrders();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private initForm(): void {
    this.orderForm = this.fb.group({
      ticker: ['AAPL', Validators.required],
      side: ['BUY', Validators.required],
      orderType: ['LIMIT', Validators.required],
      quantity: [100, [Validators.required, Validators.min(1)]],
      limitPrice: [null],
      stopPrice: [null],
      timeInForce: ['DAY', Validators.required],
      account: ['GEA-789456', Validators.required],
      notes: [''],
    });

    // Watch order type to toggle price fields
    const sub = this.orderForm.get('orderType')!.valueChanges.subscribe((type: OrderType) => {
      this.updatePriceValidators(type);
    });
    this.subscriptions.push(sub);

    this.updatePriceValidators('LIMIT');
  }

  private updatePriceValidators(orderType: OrderType): void {
    const limitCtrl = this.orderForm.get('limitPrice')!;
    const stopCtrl = this.orderForm.get('stopPrice')!;

    limitCtrl.clearValidators();
    stopCtrl.clearValidators();

    if (['LIMIT', 'STOP_LIMIT', 'LOC'].includes(orderType)) {
      limitCtrl.setValidators([Validators.required, Validators.min(0.01)]);
    }
    if (['STOP', 'STOP_LIMIT'].includes(orderType)) {
      stopCtrl.setValidators([Validators.required, Validators.min(0.01)]);
    }

    limitCtrl.updateValueAndValidity();
    stopCtrl.updateValueAndValidity();
  }

  private loadRecentOrders(): void {
    const sub = this.tradingService.getOrders().subscribe((orders) => {
      this.recentOrders = orders.slice(0, 15);
    });
    this.subscriptions.push(sub);
  }

  onSubmit(): void {
    if (this.orderForm.invalid) return;

    this.isSubmitting = true;
    this.submitSuccess = false;
    this.submitError = '';

    const formValue: OrderEntryForm = this.orderForm.value;
    const sub = this.tradingService.submitOrder(formValue).subscribe({
      next: (order) => {
        this.isSubmitting = false;
        this.submitSuccess = true;
        setTimeout(() => (this.submitSuccess = false), 3000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = 'Order submission failed. Please retry.';
      },
    });
    this.subscriptions.push(sub);
  }

  get showLimitPrice(): boolean {
    const type = this.orderForm.get('orderType')?.value;
    return ['LIMIT', 'STOP_LIMIT', 'LOC'].includes(type);
  }

  get showStopPrice(): boolean {
    const type = this.orderForm.get('orderType')?.value;
    return ['STOP', 'STOP_LIMIT'].includes(type);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'FILLED': return 'bg-success';
      case 'PARTIAL_FILL': return 'bg-warning text-dark';
      case 'CANCELLED': return 'bg-secondary';
      case 'REJECTED': return 'bg-danger';
      case 'NEW': case 'PENDING': return 'bg-info';
      case 'EXPIRED': return 'bg-dark text-secondary';
      default: return 'bg-secondary';
    }
  }

  getSideBadgeClass(side: string): string {
    switch (side) {
      case 'BUY': case 'COVER': return 'text-success';
      case 'SELL': case 'SHORT': return 'text-danger';
      default: return 'text-light';
    }
  }
}
