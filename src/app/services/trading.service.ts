// ===============================================
// ✅ TradingService FINAL - Isolation par user + Prix réels
// ===============================================
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, timer, from, of } from 'rxjs';
import { concatMap, delay, map } from 'rxjs/operators';
import { Asset, Position, OrderBook } from '../models/market.model';

export type AssetCategory = 'STOCKS' | 'FOREX' | 'METALS' | 'ETFS';

// ✅ Structure pour stocker les données par utilisateur
interface UserData {
  userId: string;
  portfolio: Position[];
  cash: number;
  cashInitialized: boolean;
}

@Injectable({ providedIn: 'root' })
export class TradingService {
  // ====== APIs externes ======
  private readonly FINNHUB_KEY  = 'd45arkpr01qsugt9h0o0d45arkpr01qsugt9h0og';
  private readonly FINNHUB_BASE = 'https://finnhub.io/api/v1';
  private readonly TWELVE_KEY   = '0c8a86648f88428586bc01fcba3d32cb';
  private readonly TWELVE_BASE  = 'https://api.twelvedata.com';
  private readonly API_URL = 'http://localhost:8080/api';

  // ====== Clés localStorage ======
  private readonly USER_DATA_KEY = 'tradix_users_data_v1';

  // ====== États observables ======
  private assets$ = new BehaviorSubject<Asset[]>([]);
  
  // ✅ NOUVEAU : Map pour stocker les données par userId
  private usersData = new Map<string, UserData>();
  private currentUserId$ = new BehaviorSubject<string>('');
  
  // Observables pour le user courant
  private portfolio$ = new BehaviorSubject<Position[]>([]);
  private cash$ = new BehaviorSubject<number>(0);
  private cashInitialized = false;
  
  private selectedAsset$ = new BehaviorSubject<string>('AAPL');
  private selectedCategory$ = new BehaviorSubject<AssetCategory>('STOCKS');

  // ====== Symboles ======
  private stockSymbols: string[] = [
    'AAPL','MSFT','GOOGL','AMZN','META','TSLA','NVDA','PYPL','INTC','AMD',
    'NFLX','ADBE','CRM','ORCL','IBM','NOW','SNOW','ZS','TEAM','DOCU',
    'JPM','BAC','WFC','GS','MS','V','MA','SQ','COIN',
    'XOM','CVX','KO','PEP','WMT','TGT','HD','LOW','NKE','SBUX'
  ];

  private forexPairs: [string, string][] = [
    ['EUR','USD'], ['USD','JPY'], ['GBP','USD'], ['USD','CHF'],
    ['AUD','USD'], ['USD','CAD'], ['NZD','USD'], ['EUR','GBP']
  ];

  private metalPairs: [string, string][] = [
    ['XAU','USD'], ['XAG','USD'], ['XPT','USD'], ['XPD','USD']
  ];

  private etfSymbols: string[] = ['SPY','QQQ','IWM','DIA','VTI','VWO','EEM','GLD','SLV','TLT'];

  constructor(private http: HttpClient) {
    this.loadUsersDataFromStorage();
    this.loadCategory('STOCKS');
    this.startRealtimeSync();
  }

  // ===========================================================
  // 🔹 GESTION DES UTILISATEURS
  // ===========================================================

  /**
   * ✅ Définir l'utilisateur courant
   */
  setCurrentUser(userId: string): void {
    if (!userId) {
      console.error('❌ userId vide !');
      return;
    }

    console.log('👤 Changement utilisateur:', userId);
    this.currentUserId$.next(userId);

    // Charger ou créer les données de cet utilisateur
    let userData = this.usersData.get(userId);
    
    if (!userData) {
      userData = {
        userId,
        portfolio: [],
        cash: 0,
        cashInitialized: false
      };
      this.usersData.set(userId, userData);
      this.saveUsersDataToStorage();
    }

    // Charger les données dans les observables
    this.portfolio$.next([...userData.portfolio]);
    this.cash$.next(userData.cash);
    this.cashInitialized = userData.cashInitialized;

    console.log('✅ Données utilisateur chargées:', {
      portfolio: userData.portfolio.length,
      cash: userData.cash
    });
  }

  getCurrentUserId(): string {
    return this.currentUserId$.value;
  }

  // ===========================================================
  // 🔹 GESTION LOCALSTORAGE
  // ===========================================================

  private loadUsersDataFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.USER_DATA_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        this.usersData = new Map(Object.entries(parsed));
        console.log('♻️ Données utilisateurs chargées:', this.usersData.size, 'users');
      }
    } catch (error) {
      console.error('❌ Erreur chargement données users:', error);
    }
  }

  private saveUsersDataToStorage(): void {
    try {
      const obj = Object.fromEntries(this.usersData);
      localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(obj));
      console.log('💾 Données utilisateurs sauvegardées');
    } catch (error) {
      console.error('❌ Erreur sauvegarde données users:', error);
    }
  }

  private saveCurrentUserData(): void {
    const userId = this.currentUserId$.value;
    if (!userId) return;

    const userData: UserData = {
      userId,
      portfolio: [...this.portfolio$.value],
      cash: this.cash$.value,
      cashInitialized: this.cashInitialized
    };

    this.usersData.set(userId, userData);
    this.saveUsersDataToStorage();
  }

  // ===========================================================
  // 🔹 GESTION DU CASH
  // ===========================================================

  setCash(amount: number): void {
    this.cash$.next(amount);
    this.cashInitialized = true;
    this.saveCurrentUserData();
  }

  getCash(): Observable<number> {
    return this.cash$.asObservable();
  }

  isCashInitialized(): boolean {
    return this.cashInitialized;
  }

  debitCash(amount: number): void {
    const current = this.cash$.value;
    this.cash$.next(current - amount);
    this.saveCurrentUserData();
    console.log('💸 Cash débité:', amount, '→ Nouveau solde:', current - amount);
  }

  creditCash(amount: number): void {
    const current = this.cash$.value;
    this.cash$.next(current + amount);
    this.saveCurrentUserData();
    console.log('💰 Cash crédité:', amount, '→ Nouveau solde:', current + amount);
  }

  // ===========================================================
  // 🔹 GESTION DU PORTFOLIO
  // ===========================================================

  getPortfolio(): Observable<Position[]> {
    return this.portfolio$.asObservable();
  }

  getPosition(symbol: string): Position | undefined {
    return this.portfolio$.value.find(p => p.symbol === symbol);
  }

  addPosition(symbol: string, quantity: number, price: number): void {
    const portfolio = [...this.portfolio$.value];
    const existing = portfolio.find(p => p.symbol === symbol);

    if (existing) {
      const totalQty = existing.quantity + quantity;
      const totalCost = (existing.avgPrice * existing.quantity) + (price * quantity);
      existing.avgPrice = totalCost / totalQty;
      existing.quantity = totalQty;
      existing.currentPrice = price;
    } else {
      portfolio.push({
        symbol,
        quantity,
        avgPrice: price,
        currentPrice: price
      });
    }

    this.portfolio$.next(portfolio);
    this.saveCurrentUserData();
    console.log('📈 Position ajoutée:', symbol, quantity, '@', price);
  }

  removePosition(symbol: string, quantity: number): void {
    const portfolio = [...this.portfolio$.value];
    const existing = portfolio.find(p => p.symbol === symbol);

    if (existing) {
      existing.quantity -= quantity;
      
      if (existing.quantity <= 0) {
        const index = portfolio.indexOf(existing);
        portfolio.splice(index, 1);
      }
    }

    this.portfolio$.next(portfolio);
    this.saveCurrentUserData();
    console.log('📉 Position retirée:', symbol, quantity);
  }

  getTotalPortfolioValue(): number {
    return this.portfolio$.value.reduce(
      (sum, pos) => sum + (pos.quantity * pos.currentPrice),
      0
    );
  }

  getTotalPnL(): number {
    return this.portfolio$.value.reduce(
      (sum, pos) => sum + (pos.quantity * (pos.currentPrice - pos.avgPrice)),
      0
    );
  }

  // ===========================================================
  // 🔹 Helpers
  // ===========================================================
  
  private getCompanyName(symbol: string): string {
    const map: Record<string, string> = {
      AAPL:'Apple Inc.', MSFT:'Microsoft', GOOGL:'Alphabet', AMZN:'Amazon',
      META:'Meta Platforms', TSLA:'Tesla', NVDA:'NVIDIA', JPM:'JPMorgan Chase',
      V:'Visa', MA:'MasterCard', XOM:'ExxonMobil', NFLX:'Netflix',
      ADBE:'Adobe', CRM:'Salesforce', ORCL:'Oracle', IBM:'IBM'
    };
    return map[symbol] || symbol;
  }

  private prettyMetalName(base: string): string {
    const m: Record<string,string> = {
      XAU:'Or (Gold)', XAG:'Argent (Silver)', XPT:'Platine', XPD:'Palladium'
    };
    return m[base] || base;
  }

  private simulatePct(symbol: string, priceNow: number): number {
    let h = 0;
    for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) >>> 0;
    const rnd = ((h % 201) - 100) / 100;
    return +(rnd * 0.6).toFixed(2);
  }

  // ===========================================================
  // 🔹 Gestion Catégorie
  // ===========================================================
  
  getSelectedCategory(): Observable<AssetCategory> {
    return this.selectedCategory$.asObservable();
  }

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
        const encoded = encodeURIComponent(symbol);
        const q = await this.fetchWithRetry(
          `${this.TWELVE_BASE}/quote?symbol=${encoded}&apikey=${this.TWELVE_KEY}`
        );
        if (q && (q.close || q.price)) {
          price = Number(q.close ?? q.price);
          if (q.percent_change !== undefined && q.percent_change !== null && isFinite(Number(q.percent_change))) {
            pct = Number(q.percent_change);
          } else {
            pct = this.simulatePct(symbol, price);
          }
        } else {
          const p = await this.fetchWithRetry(
            `${this.TWELVE_BASE}/price?symbol=${encoded}&apikey=${this.TWELVE_KEY}`
          );
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
    const REFRESH_INTERVAL = 15000;
    const DELAY_BETWEEN_CALLS = 1200;

    timer(0, REFRESH_INTERVAL).pipe(
      concatMap(() => {
        const cat  = this.selectedCategory$.value;
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
  
  updateAssetPrice(
    symbol: string,
    newPrice: number,
    changePct: number,
    bid?: number,
    ask?: number,
    volume?: string
  ): void {
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

    // Propage le prix aux positions du user courant
    const updatedPortfolio = this.portfolio$.value.map(p =>
      p.symbol === symbol ? { ...p, currentPrice: newPrice } : p
    );
    this.portfolio$.next(updatedPortfolio);
    this.saveCurrentUserData();
  }

  // ===========================================================
  // 🔹 Observables publics
  // ===========================================================
  
  getAssets(): Observable<Asset[]> {
    return this.assets$.asObservable();
  }

  getAllAssets(): Observable<Asset[]> {
    return this.assets$.asObservable();
  }

  getAssetBySymbol(symbol: string): Asset | undefined {
    return this.assets$.value.find(a => a.symbol === symbol);
  }

  getSelectedAsset(): Observable<string> {
    return this.selectedAsset$.asObservable();
  }

  selectAsset(symbol: string): void {
    this.selectedAsset$.next(symbol);
    this.fetchRealPrice(symbol, this.selectedCategory$.value);
  }

  getOrderBook(symbol: string): Observable<OrderBook> {
    return this.http.get<OrderBook>(`${this.API_URL}/orderbook/${encodeURIComponent(symbol)}`);
  }

  // ===========================================================
  // 🔹 DEBUG / RESET
  // ===========================================================
  
  resetUserData(userId: string): void {
    if (confirm(`⚠️ Réinitialiser les données de ${userId} ?`)) {
      this.usersData.delete(userId);
      this.saveUsersDataToStorage();
      
      if (this.currentUserId$.value === userId) {
        this.portfolio$.next([]);
        this.cash$.next(0);
        this.cashInitialized = false;
      }
      
      console.log('🔄 Données utilisateur réinitialisées:', userId);
    }
  }

  resetAllUsers(): void {
    if (confirm('⚠️ Réinitialiser TOUS les utilisateurs ?')) {
      this.usersData.clear();
      localStorage.removeItem(this.USER_DATA_KEY);
      this.portfolio$.next([]);
      this.cash$.next(0);
      this.cashInitialized = false;
      console.log('🔄 Tous les utilisateurs réinitialisés');
    }
  }
}