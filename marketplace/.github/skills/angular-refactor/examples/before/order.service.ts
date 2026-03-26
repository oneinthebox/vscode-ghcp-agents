// Example input for /angular-refactor — see SKILL.md for usage
// BEFORE: constructor injection, NgModule-style, subscribe() chains, *ngIf reference
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

import { Order, OrderStatus } from '@shared/models/order.model';

// Template uses: *ngIf="orders$ | async as orders"
@Injectable()
export class OrderService {
  private readonly ordersSubject = new BehaviorSubject<Order[]>([]);
  readonly orders$ = this.ordersSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
  ) {}

  loadOrders(accountId: string): void {
    this.http.get<Order[]>(`/api/orders?account=${accountId}`).subscribe({
      next: (orders) => this.ordersSubject.next(orders),
      error: (err) => console.error('OrderService load failed', err),
    });
  }

  updateStatus(orderId: string, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`/api/orders/${orderId}`, { status });
  }

  cancelOrder(orderId: string): void {
    this.http.delete(`/api/orders/${orderId}`).subscribe({
      next: () => {
        const current = this.ordersSubject.getValue();
        this.ordersSubject.next(current.filter((o) => o.id !== orderId));
      },
      error: (err) => console.error('Cancel failed', err),
    });
  }

  getTotal(): number {
    return this.ordersSubject
      .getValue()
      .reduce((sum, o) => sum + o.total, 0);
  }
}
