export interface AllocationRequest {
  sessionId: number;
  totalCapital: number;
  symbols: string[];
  strategy: 'MAX_RETURN' | 'LOW_VOL';
}

export interface AllocationResult {
  strategy: string;
  totalCapital: number;
  weights: { [symbol: string]: number };
  amounts: { [symbol: string]: number };
  expectedReturn: { [symbol: string]: number };
  volatility: { [symbol: string]: number };
  comment: string;
}
