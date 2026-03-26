// Example output from /angular-refactor — see SKILL.md for usage
// AFTER: inject(), providedIn: 'root', signal-based state, @if reference
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { LoggingService } from '@core/services/logging.service';
import { Order, OrderStatus } from '@shared/models/order.model';

// Template uses: @if (orders().length > 0) { ... }
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggingService);

  readonly orders = signal<Order[]>([]);
  readonly total = computed(() =>
    this.orders().reduce((sum, o) => sum + o.total, 0)
  );

  loadOrders(accountId: string): void {
    this.http.get<Order[]>(`/api/orders?account=${accountId}`).subscribe({
      next: (orders) => this.orders.set(orders),
      error: (err) => this.logger.error('OrderService', `Load failed: ${err.message}`),
    });
  }

  updateStatus(orderId: string, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`/api/orders/${orderId}`, { status }).pipe(
      catchError((err) => {
        this.logger.error('OrderService', `Update failed: ${err.message}`);
        return throwError(() => err);
      })
    );
  }

  cancelOrder(orderId: string): void {
    this.http.delete(`/api/orders/${orderId}`).subscribe({
      next: () => this.orders.update((list) => list.filter((o) => o.id !== orderId)),
      error: (err) => this.logger.error('OrderService', `Cancel failed: ${err.message}`),
    });
  }
}
