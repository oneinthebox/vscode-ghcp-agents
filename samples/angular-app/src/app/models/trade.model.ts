export interface Trade {
  id: string;
  fundId: string;
  ticker: string;
  companyName: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price: number;
  limitPrice?: number;
  stopPrice?: number;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED';
  filledQuantity: number;
  avgFillPrice: number;
  commission: number;
  createdAt: string;
  executedAt?: string;
  notes: string;
  broker: string;
}

export interface TradeBlotter {
  trades: Trade[];
  totalCount: number;
  totalValue: number;
  buyCount: number;
  sellCount: number;
}

export interface OrderRequest {
  fundId: string;
  ticker: string;
  side: string;
  orderType: string;
  quantity: number;
  price?: number;
  limitPrice?: number;
  notes?: string;
}
