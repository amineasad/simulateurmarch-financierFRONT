export interface OrderBookLevel { price: number; qty: number }

export interface OrderBookSnapshot {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid?: number;
  bestAsk?: number;
}

export type Side = 'BUY' | 'SELL';

export interface OrderView {
  id: number;
  assetId: number;
  side: Side;
  status: string;
  filled: number;
  remaining: number;
  price?: number;
  message?: string;
}

export interface TradeView {
  id: number;
  assetId: number;
  price: number;
  quantity: number;
  ts: string;
}

