import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Asset, Position, OrderBook } from '../models/market.model';

@Injectable({ providedIn: 'root' })
export class TradingService {
  // ====== API externes ======
  private readonly FINNHUB_API = 'https://finnhub.io/api/v1/quote';
  private readonly FINNHUB_KEY = 'd44hgdpr01qt371v3oe0d44hgdpr01qt371v3oeg'; // ⬅️ remplace par ta clé Finnhub
  private readonly API_URL = 'http://localhost:8080/api'; // (backend perso si besoin)

  // ====== États observables ======
  private assets$ = new BehaviorSubject<Asset[]>([]);
  private portfolio$ = new BehaviorSubject<Position[]>([]);
  private cash$ = new BehaviorSubject<number>(100000);
  private selectedAsset$ = new BehaviorSubject<string>('AAPL');

  constructor(private http: HttpClient) {
    this.loadInitialData();    // charge la watchlist (sans prix)
    this.startRealtimeSync();  // met à jour les prix en continu
  }

  // -------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------
  /** Charge les symboles à suivre + récupère immédiatement leurs prix réels */
  private loadInitialData(): void {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'META'];

    const assets: Asset[] = symbols.map(symbol => ({
      symbol,
      name: this.getCompanyName(symbol),
      price: 0,
      change: 0,   // variation %
      volume: '',  // optionnel
      bid: 0,
      ask: 0
    }));

    this.assets$.next(assets);

    // Charger une première fois les prix réels
    symbols.forEach(s => this.fetchRealPrice(s));
  }

  /** Associe le nom société au ticker */
  private getCompanyName(symbol: string): string {
    switch (symbol) {
      case 'AAPL': return 'Apple Inc.';
      case 'MSFT': return 'Microsoft';
      case 'GOOGL': return 'Alphabet';
      case 'TSLA': return 'Tesla Inc.';
      case 'AMZN': return 'Amazon';
      case 'META': return 'Meta';
      default: return symbol;
    }
  }

  // -------------------------------------------------------------
  // Prix réels (Finnhub)
  // -------------------------------------------------------------
  /** Récupère le prix courant via Finnhub puis met à jour l’asset */
  fetchRealPrice(symbol: string): void {
    this.http.get<any>(`${this.FINNHUB_API}?symbol=${symbol}&token=${this.FINNHUB_KEY}`)
      .subscribe({
        next: (data) => {
          if (!data || data.c == null || data.pc == null) return;

          const price = Number(data.c);
          const prevClose = Number(data.pc);
          const changePct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

          // Optionnel: bid/ask/mock volume (car Finnhub/quote ne les fournit pas ici)
          const bid = price - 0.02;
          const ask = price + 0.02;

          this.updateAssetPrice(symbol, price, changePct, bid, ask, '—');
        },
        error: (err) => console.error(`Erreur Finnhub pour ${symbol}:`, err)
      });
  }

  /** Rafraîchit tous les prix toutes les 5s */
  startRealtimeSync(): void {
    setInterval(() => {
      const list = this.assets$.value;
      list.forEach(a => this.fetchRealPrice(a.symbol));
    }, 5000);
  }

  // -------------------------------------------------------------
  // Mises à jour locales
  // -------------------------------------------------------------
  /**
   * Met à jour un asset dans la watchlist et aligne les positions (currentPrice)
   * @param change : variation % (pas en valeur absolue)
   */
  updateAssetPrice(
    symbol: string,
    newPrice: number,
    change: number,
    bid?: number,
    ask?: number,
    volume?: string
  ): void {
    const updated = this.assets$.value.map(a => {
      if (a.symbol !== symbol) return a;
      return {
        ...a,
        price: newPrice,
        change,
        bid: bid ?? a.bid,
        ask: ask ?? a.ask,
        volume: volume ?? a.volume
      };
    });
    this.assets$.next(updated);

    // Aligner les positions sur le dernier prix
    const updatedPortfolio = this.portfolio$.value.map(p =>
      p.symbol === symbol ? { ...p, currentPrice: newPrice } : p
    );
    this.portfolio$.next(updatedPortfolio);
  }

  // -------------------------------------------------------------
  // Portefeuille (utilisé par trading-room + portfolio)
  // -------------------------------------------------------------
  /** Ajoute/renforce une position (prix moyen recalculé) */
  addPosition(symbol: string, quantity: number, price: number): void {
    const current = this.portfolio$.value;
    const existing = current.find(p => p.symbol === symbol);

    if (existing) {
      const newQty = existing.quantity + quantity;
      const newAvg =
        ((existing.avgPrice * existing.quantity) + (price * quantity)) / newQty;

      const next = current.map(p =>
        p.symbol === symbol
          ? { ...p, quantity: newQty, avgPrice: newAvg, currentPrice: price }
          : p
      );
      this.portfolio$.next(next);
    } else {
      const newPos: Position = {
        symbol,
        quantity,
        avgPrice: price,
        currentPrice: price
      };
      this.portfolio$.next([...current, newPos]);
    }
  }

  /** Réduit/ferme une position */
  removePosition(symbol: string, quantity: number): void {
    const next = this.portfolio$.value
      .map(p => p.symbol === symbol ? { ...p, quantity: p.quantity - quantity } : p)
      .filter(p => p.quantity > 0);
    this.portfolio$.next(next);
  }

  /** Renvoie la position pour un symbole (ou undefined) */
  getPosition(symbol: string): Position | undefined {
    return this.portfolio$.value.find(p => p.symbol === symbol);
  }

  /** Valeur totale (positions uniquement, sans le cash) */
  getTotalPortfolioValue(): number {
    return this.portfolio$.value.reduce((sum, p) => sum + p.quantity * p.currentPrice, 0);
  }

  /** PnL total (somme des PnL de chaque position) */
  getTotalPnL(): number {
    return this.portfolio$.value.reduce(
      (sum, p) => sum + p.quantity * (p.currentPrice - p.avgPrice),
      0
    );
  }

  // -------------------------------------------------------------
  // Getters observables
  // -------------------------------------------------------------
  getAssets(): Observable<Asset[]> { return this.assets$.asObservable(); }
  getPortfolio(): Observable<Position[]> { return this.portfolio$.asObservable(); }
  getCash(): Observable<number> { return this.cash$.asObservable(); }

  // Sélection de l’asset courant (watchlist → graphique)
  getSelectedAsset(): Observable<string> { return this.selectedAsset$.asObservable(); }
  selectAsset(symbol: string): void { this.selectedAsset$.next(symbol); }

  // -------------------------------------------------------------
  // Divers (backend perso)
  // -------------------------------------------------------------
  getAsset(symbol: string): Asset | undefined {
    return this.assets$.value.find(a => a.symbol === symbol);
  }

  getOrderBook(symbol: string): Observable<OrderBook> {
    // Adapter si ton backend renvoie un carnet
    return this.http.get<OrderBook>(`${this.API_URL}/orderbook/${symbol}`);
  }

  // Stubs optionnels si tu veux brancher tes ordres PENDING depuis le portfolio
  // (tu peux les brancher plus tard et appeler ces méthodes dans PortfolioComponent)
  // getPendingOrders(userId: number): Observable<any[]> { return of([]); }
  // cancelOrder(orderId: number): Observable<void> { return of(void 0); }
}
