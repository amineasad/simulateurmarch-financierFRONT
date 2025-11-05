// src/app/services/market-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface Quote {
  price: number;         // last
  change: number;        // delta absolu
  changePercent: number; // delta %
  prevClose?: number;
}

@Injectable({ providedIn: 'root' })
export class MarketDataService {
  // ⚠️ Mets ta clé ici (tu peux réutiliser la même que la trading room)
  private readonly FINNHUB_KEY = 'd45afohr01qsugt9fes0d45afohr01qsugt9fesg';
  private readonly BASE = 'https://finnhub.io/api/v1';

  private symbols = new Set<string>();
  private quotes$ = new BehaviorSubject<Record<string, Quote>>({});
  private pollSub?: Subscription;

  constructor(private http: HttpClient) {}

  startPolling(initialSymbols: string[], ms = 5000) {
    initialSymbols.forEach(s => this.symbols.add(s));
    this.stopPolling();
    this.pollSub = interval(ms)
      .pipe(switchMap(() => this.fetchAll()))
      .subscribe(map => this.quotes$.next(map));
    // premier tir immédiat
    this.fetchAll().subscribe(map => this.quotes$.next(map));
  }

  stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
  }

  trackSymbol(s: string) {
    if (!this.symbols.has(s)) {
      this.symbols.add(s);
      this.fetchAll().subscribe(map => this.quotes$.next(map));
    }
  }

  streamQuotes(): Observable<Record<string, Quote>> {
    return this.quotes$.asObservable();
  }

  private fetchAll(): Observable<Record<string, Quote>> {
    const symbols = Array.from(this.symbols);
    if (symbols.length === 0) return new BehaviorSubject({}).asObservable();

    // On fait un “batch” simple: plusieurs requêtes /quote, puis on assemble.
    // Tu peux optimiser (throttle, etc.) si besoin.
    const requests = symbols.map(sym =>
      this.http.get<any>(`${this.BASE}/quote`, {
        params: { symbol: sym, token: this.FINNHUB_KEY }
      })
    );

    return new Observable<Record<string, Quote>>(sub => {
      const acc: Record<string, Quote> = {};
      let done = 0;
      requests.forEach((obs, i) => {
        obs.subscribe({
          next: (r) => {
            const sym = symbols[i];
            // Finnhub: c = current, d = change, dp = change%
            acc[sym] = {
              price: r.c ?? 0,
              change: r.d ?? 0,
              changePercent: r.dp ?? 0,
              prevClose: r.pc
            };
          },
          error: () => {
            // fallback: garde la dernière valeur si erreur
            const last = this.quotes$.value[symbols[i]];
            if (last) acc[symbols[i]] = last;
          },
          complete: () => {
            done++;
            if (done === requests.length) {
              sub.next(acc);
              sub.complete();
            }
          }
        });
      });
    });
  }
}
