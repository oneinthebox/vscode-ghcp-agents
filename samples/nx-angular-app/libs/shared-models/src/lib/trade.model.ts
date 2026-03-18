export type OrderSide = 'BUY' | 'SELL' | 'SHORT' | 'COVER';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'MOC' | 'LOC';
export type OrderStatus = 'NEW' | 'PENDING' | 'PARTIAL_FILL' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';
export type TimeInForce = 'DAY' | 'GTC' | 'IOC' | 'FOK' | 'GTD';
export type ExecutionVenue = 'NYSE' | 'NASDAQ' | 'ARCA' | 'BATS' | 'IEX' | 'DARK';

export interface Order {
  orderId: string;
  portfolioId: string;
  ticker: string;
  companyName: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  limitPrice?: number;
  stopPrice?: number;
  avgFillPrice?: number;
  status: OrderStatus;
  timeInForce: TimeInForce;
  submittedAt: Date;
  updatedAt: Date;
  account: string;
  broker: string;
  notes?: string;
}

export interface Trade {
  tradeId: string;
  orderId: string;
  ticker: string;
  companyName: string;
  side: OrderSide;
  quantity: number;
  price: number;
  notional: number;
  commission: number;
  fees: number;
  netAmount: number;
  venue: ExecutionVenue;
  executedAt: Date;
  settlementDate: Date;
  account: string;
  counterparty: string;
  status: 'CONFIRMED' | 'PENDING' | 'SETTLED' | 'FAILED';
}

export interface Execution {
  executionId: string;
  tradeId: string;
  orderId: string;
  ticker: string;
  side: OrderSide;
  quantity: number;
  price: number;
  venue: ExecutionVenue;
  timestamp: Date;
  liquidityFlag: 'ADD' | 'REMOVE' | 'ROUTED';
  sequenceNumber: number;
}

export interface OrderEntryForm {
  ticker: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number | null;
  limitPrice: number | null;
  stopPrice: number | null;
  timeInForce: TimeInForce;
  account: string;
  notes: string;
}
