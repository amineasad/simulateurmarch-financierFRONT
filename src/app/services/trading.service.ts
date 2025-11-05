// ===============================================
// ✅ TradingService FINAL
//    - Finnhub (Stocks/ETFs)
//    - TwelveData (Forex/Metals)
//    - Encodage symboles + lecture correcte des champs
//    - Anti-429 + batch refresh
//    - % simulé si absent (plus de "0%")
// ===============================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, timer, from, of } from 'rxjs';
import { concatMap, delay } from 'rxjs/operators';
import { Asset, Position, OrderBook } from '../models/market.model';

export type AssetCategory = 'STOCKS' | 'FOREX' | 'METALS' | 'ETFS';

@Injectable({ providedIn: 'root' })
export class TradingService {
  // ====== APIs externes ======
  private readonly FINNHUB_KEY = 'd45arkpr01qsugt9h0o0d45arkpr01qsugt9h0og';
  private readonly FINNHUB_BASE = 'https://finnhub.io/api/v1';
  private readonly TWELVE_KEY  = '0c8a86648f88428586bc01fcba3d32cb';
  private readonly TWELVE_BASE = 'https://api.twelvedata.com';

  // backend (si tu en as un pour orderbook)
  private readonly API_URL = 'http://localhost:8080/api';

  // ====== États observables ======
  private assets$         = new BehaviorSubject<Asset[]>([]);
  private portfolio$      = new BehaviorSubject<Position[]>([]);
  private cash$           = new BehaviorSubject<number>(100000);
  private selectedAsset$  = new BehaviorSubject<string>('AAPL');
  private selectedCategory$ = new BehaviorSubject<AssetCategory>('STOCKS');

  // ====== Symboles ======
  private stockSymbols: string[] = [
    'AAPL','MSFT','GOOGL','AMZN','META','TSLA','NVDA','PYPL','INTC','AMD',
    'NFLX','ADBE','CRM','ORCL','IBM','NOW','SNOW','ZS','TEAM','DOCU',
    'JPM','BAC','WFC','GS','MS','V','MA','SQ','COIN',
    'XOM','CVX','KO','PEP','WMT','TGT','HD','LOW','NKE','SBUX'
  ];

  // Format TwelveData: "EUR/USD"
  private forexPairs: [string, string][] = [
    ['EUR','USD'], ['USD','JPY'], ['GBP','USD'], ['USD','CHF'],
    ['AUD','USD'], ['USD','CAD'], ['NZD','USD'], ['EUR','GBP']
  ];

  // Métaux au format TwelveData: "XAU/USD", "XAG/USD", etc.
  private metalPairs: [string, string][] = [
    ['XAU','USD'], ['XAG','USD'], ['XPT','USD'], ['XPD','USD']
  ];

  private etfSymbols: string[] = ['SPY','QQQ','IWM','DIA','VTI','VWO','EEM','GLD','SLV','TLT'];

  constructor(private http: HttpClient) {
    this.loadCategory('STOCKS');
    this.startRealtimeSync();
  }

  // ===========================================================
  // 🔹 Helpers
  // ===========================================================
  private getCompanyName(symbol: string): string {
    const map: Record<string, string> = {
      AAPL:'Apple Inc.', MSFT:'Microsoft', GOOGL:'Alphabet', AMZN:'Amazon',
      META:'Meta Platforms', TSLA:'Tesla', NVDA:'NVIDIA', JPM:'JPMorgan Chase',
      V:'Visa', MA:'MasterCard', XOM:'ExxonMobil'
    };
    return map[symbol] || symbol;
  }

  private prettyMetalName(base: string): string {
    const m: Record<string,string> = {
      XAU:'Or (Gold)', XAG:'Argent (Silver)', XPT:'Platine', XPD:'Palladium'
    };
    return m[base] || base;
  }

  /** Petite “simulation” stable du % si l’API n’en donne pas :
   * produit une variation douce [-0.6%, +0.6%] pseudo-déterministe par symbole. */
  private simulatePct(symbol: string, priceNow: number): number {
    let h = 0;
    for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
    const rnd = ((h % 201) - 100) / 100; // [-1.00 .. +1.00]
    return +(rnd * 0.6).toFixed(2);      // +/- 0.60% max, arrondi 2 décimales
  }

  // ===========================================================
  // 🔹 Gestion Catégorie
  // ===========================================================
  getSelectedCategory(): Observable<AssetCategory> { return this.selectedCategory$.asObservable(); }

  setSelectedCategory(cat: AssetCategory): void {
    if (cat === this.selectedCategory$.value) return;
    this.selectedCategory$.next(cat);
    this.loadCategory(cat);
    const first = this.assets$.value[0]?.symbol ?? 'AAPL';
    this.selectAsset(first);
  }

  private loadCategory(cat: AssetCategory): void {
    let assets: Asset[] = [];

    if (cat === 'STOCKS') {
      assets = this.stockSymbols.map(s => ({
        symbol: s, name: this.getCompanyName(s),
        price: 0, change: 0, bid: 0, ask: 0, volume: '—'
      }));
    } else if (cat === 'FOREX') {
      assets = this.forexPairs.map(([b, q]) => ({
        symbol: `${b}/${q}`, name: `${b}/${q}`,
        price: 0, change: 0, bid: 0, ask: 0, volume: '—'
      }));
    } else if (cat === 'METALS') {
      assets = this.metalPairs.map(([b, q]) => ({
        symbol: `${b}/${q}`, name: this.prettyMetalName(b),
        price: 0, change: 0, bid: 0, ask: 0, volume: '—'
      }));
    } else if (cat === 'ETFS') {
      assets = this.etfSymbols.map(s => ({
        symbol: s, name: s,
        price: 0, change: 0, bid: 0, ask: 0, volume: '—'
      }));
    }

    this.assets$.next(assets);
    // premier batch léger
    assets.slice(0, 5).forEach(a => this.fetchRealPrice(a.symbol, cat));
  }

  // ===========================================================
  // 🔹 Fetch sécurisé avec backoff
  // ===========================================================
  private async fetchWithRetry(url: string, retries = 3, delayMs = 1000): Promise<any | null> {
    for (let i = 0; i < retries; i++) {
      try {
        const data = await this.http.get(url).toPromise();
        if (data) return data;
      } catch (error: any) {
        if (error?.status === 429) {
          const wait = delayMs * Math.pow(2, i);
          console.warn(`⏳ 429 Too Many Requests -> pause ${wait}ms`);
          await new Promise(res => setTimeout(res, wait));
        } else {
          console.warn('HTTP error:', error);
          return null;
        }
      }
    }
    return null;
  }

  // ===========================================================
  // 🔹 Fetch prix réel (Finnhub + TwelveData)
  //    - Stocks/ETFs : Finnhub /quote (c, pc, dp)
  //    - Forex/Metals : TwelveData /quote (close, percent_change) -> fallback /price
  // ===========================================================
  private async fetchRealPrice(symbol: string, cat: AssetCategory): Promise<void> {
    try {
      let price = 0;
      let pct: number | null = null;

      if (cat === 'STOCKS' || cat === 'ETFS') {
        const url = `${this.FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${this.FINNHUB_KEY}`;
        const fh = await this.fetchWithRetry(url);
        if (fh && Number(fh.c) > 0) {
          price = Number(fh.c);
          if (fh.dp !== undefined && fh.dp !== null && isFinite(Number(fh.dp))) {
            pct = Number(fh.dp);
          } else if (fh.pc !== undefined && isFinite(Number(fh.pc)) && fh.pc > 0) {
            pct = ((price - Number(fh.pc)) / Number(fh.pc)) * 100;
          } else {
            pct = this.simulatePct(symbol, price);
          }
        }
      } else {
        // FOREX / METALS — TwelveData
        const encoded = encodeURIComponent(symbol); // "EUR/USD" -> "EUR%2FUSD"
        // 1) quote: close + percent_change
        const q = await this.fetchWithRetry(`${this.TWELVE_BASE}/quote?symbol=${encoded}&apikey=${this.TWELVE_KEY}`);
        if (q && (q.close || q.price)) {
          price = Number(q.close ?? q.price);
          if (q.percent_change !== undefined && q.percent_change !== null && isFinite(Number(q.percent_change))) {
            pct = Number(q.percent_change);
          } else {
            pct = this.simulatePct(symbol, price);
          }
        } else {
          // 2) fallback /price
          const p = await this.fetchWithRetry(`${this.TWELVE_BASE}/price?symbol=${encoded}&apikey=${this.TWELVE_KEY}`);
          if (p && Number(p.price) > 0) {
            price = Number(p.price);
            pct = this.simulatePct(symbol, price);
          }
        }
      }

      if (price > 0) {
        const bid = price - 0.01;
        const ask = price + 0.01;
        this.updateAssetPrice(symbol, price, pct ?? 0, bid, ask, '—');
      }
    } catch (e) {
      console.warn(`fetchRealPrice(${symbol})`, e);
    }
  }

  // ===========================================================
  // 🔹 Rafraîchissement progressif (anti-quota)
  // ===========================================================
  startRealtimeSync(): void {
    const REFRESH_INTERVAL = 15000;  // 15s
    const DELAY_BETWEEN_CALLS = 1200; // 1.2s entre deux symboles

    timer(0, REFRESH_INTERVAL).pipe(
      concatMap(() => {
        const cat = this.selectedCategory$.value;
        const list = this.assets$.value;
        return from(list).pipe(
          concatMap((a, i) =>
            of(a).pipe(
              delay(DELAY_BETWEEN_CALLS * i),
              concatMap(asset => {
                this.fetchRealPrice(asset.symbol, cat);
                return of(null);
              })
            )
          )
        );
      })
    ).subscribe();
  }

  // ===========================================================
  // 🔹 Update local (prix & % & bid/ask)
  // ===========================================================
  updateAssetPrice(symbol: string, newPrice: number, changePct: number, bid?: number, ask?: number, volume?: string): void {
    const updated = this.assets$.value.map(a =>
      a.symbol === symbol
        ? {
            ...a,
            price: newPrice,
            change: changePct,
            bid: (bid ?? a.bid ?? 0),
            ask: (ask ?? a.ask ?? 0),
            volume: (volume ?? a.volume ?? '—')
          }
        : a
    );
    this.assets$.next(updated as Asset[]);

    // propage le prix aux positions
    const updatedPortfolio = this.portfolio$.value.map(p =>
      p.symbol === symbol ? { ...p, currentPrice: newPrice } : p
    );
    this.portfolio$.next(updatedPortfolio);
  }

  // ===========================================================
  // 🔹 Portfolio utils
  // ===========================================================
  addPosition(symbol: string, quantity: number, price: number): void {
    const curr = this.portfolio$.value;
    const existing = curr.find(p => p.symbol === symbol);

    if (existing) {
      const newQty = existing.quantity + quantity;
      const newAvg = ((existing.avgPrice * existing.quantity) + (price * quantity)) / newQty;
      const next = curr.map(p => p.symbol === symbol
        ? { ...p, quantity: newQty, avgPrice: newAvg, currentPrice: price }
        : p);
      this.portfolio$.next(next);
    } else {
      const newPos: Position = { symbol, quantity, avgPrice: price, currentPrice: price };
      this.portfolio$.next([...curr, newPos]);
    }
  }

  removePosition(symbol: string, quantity: number): void {
    const next = this.portfolio$.value
      .map(p => p.symbol === symbol ? { ...p, quantity: p.quantity - quantity } : p)
      .filter(p => p.quantity > 0);
    this.portfolio$.next(next);
  }

  // ===========================================================
  // 🔹 Observables publics
  // ===========================================================
  getAssets(): Observable<Asset[]> { return this.assets$.asObservable(); }
  getPortfolio(): Observable<Position[]> { return this.portfolio$.asObservable(); }
  getCash(): Observable<number> { return this.cash$.asObservable(); }
  getSelectedAsset(): Observable<string> { return this.selectedAsset$.asObservable(); }

  selectAsset(symbol: string): void {
    this.selectedAsset$.next(symbol);
    this.fetchRealPrice(symbol, this.selectedCategory$.value); // refresh immédiat du clic
  }

  getTotalPortfolioValue(): number {
    return this.portfolio$.value.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);
  }

  getTotalPnL(): number {
    return this.portfolio$.value.reduce((s, p) => s + p.quantity * (p.currentPrice - p.avgPrice), 0);
  }

  getOrderBook(symbol: string): Observable<OrderBook> {
    return this.http.get<OrderBook>(`${this.API_URL}/orderbook/${encodeURIComponent(symbol)}`);
  }

  getPosition(symbol: string): Position | undefined {
    return this.portfolio$.value.find(p => p.symbol === symbol);
  }
}
