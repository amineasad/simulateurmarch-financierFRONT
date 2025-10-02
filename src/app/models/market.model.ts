// src/app/models/market.model.ts

export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: string;
  bid: number;
  ask: number;
}

export interface Order {
  id?: string;
  userId: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT' | 'STOP';
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  timestamp?: Date;
  status?: 'PENDING' | 'EXECUTED' | 'CANCELLED';
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface Notification {
  id: number;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  time: string;
}

export interface ChatMessage {
  user: string;
  message: string;
  time: string;
}

export interface MarketUpdate {
  symbol: string;
  price: number;
  executedOrder?: Order;
  message: string;
}