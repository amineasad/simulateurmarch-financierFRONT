// src/app/services/market-data.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';

export interface Quote {
  price: number;
  change: number;
  changePercent: number;
  prevClose?: number;
}

@Injectable({ providedIn: 'root' })
export class MarketDataService {
  private quotes$ = new BehaviorSubject<Record<string, Quote>>({});
  private pollSub?: Subscription;
  private symbols: string[] = [];

  constructor() {}

  startPolling(initialSymbols: string[], ms = 2000): void {
    this.symbols = initialSymbols;
    this.stopPolling();

    const init: Record<string, Quote> = {};
    for (const s of this.symbols) {
      const startPrice = 100 + Math.random() * 100;
      init[s] = { price: startPrice, change: 0, changePercent: 0, prevClose: startPrice };
    }
    this.quotes$.next(init);

    this.pollSub = interval(ms).subscribe(() => {
      const updated = { ...this.quotes$.value };
      for (const sym of this.symbols) {
        const last = updated[sym]?.price ?? 100;
        const prevClose = updated[sym]?.prevClose ?? last;
        const variation = (Math.random() - 0.5) * 3; // variation +/- 1.5%
        const newPrice = Math.max(1, last + variation);
        const change = newPrice - prevClose;
        const changePercent = (change / prevClose) * 100;
        updated[sym] = { price: newPrice, change, changePercent, prevClose };
      }
      this.quotes$.next(updated);
    });
  }

  stopPolling(): void {
    this.pollSub?.unsubscribe();
  }

  trackSymbol(symbol: string): void {
    if (!this.symbols.includes(symbol)) {
      this.symbols.push(symbol);
      const updated = { ...this.quotes$.value };
      const startPrice = 100 + Math.random() * 100;
      updated[symbol] = { price: startPrice, change: 0, changePercent: 0, prevClose: startPrice };
      this.quotes$.next(updated);
    }
  }

  streamQuotes(): Observable<Record<string, Quote>> {
    return this.quotes$.asObservable();
  }

  getCurrentPrice(symbol: string): number {
    return this.quotes$.value[symbol]?.price ?? 0;
  }
}