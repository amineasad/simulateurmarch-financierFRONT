// ====================================================================
// src/app/services/local-orderbook.service.ts - AVEC LOCALSTORAGE COMPLET
// ====================================================================

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface OrderBookEntry {
  price: number;
  quantity: number;
}

export interface LocalOrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastPrice: number;
}

// ✅ Interface pour tracker MES ordres
export interface PendingOrder {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class LocalOrderBookService {
  private orderBooks$ = new BehaviorSubject<Record<string, LocalOrderBook>>({});
  
  // ✅ BehaviorSubject pour MES ordres en attente
  private myPendingOrders$ = new BehaviorSubject<PendingOrder[]>([]);
  
  // ✅ Clés localStorage
  private readonly STORAGE_KEY = 'tradix_orderbooks_v2';
  private readonly MY_ORDERS_KEY = 'tradix_my_orders_v2';

  constructor() {
    console.log('📚 LocalOrderBookService initialisé');
    this.loadOrderBooksFromStorage();
    this.loadMyOrdersFromStorage();
  }

  // ===============================================================
  // 🔹 GESTION LOCALSTORAGE - CARNETS D'ORDRES
  // ===============================================================

  /**
   * ✅ Charger les carnets depuis localStorage
   */
  private loadOrderBooksFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        this.orderBooks$.next(parsed);
        console.log('♻️ Carnets chargés depuis localStorage:', Object.keys(parsed).length);
      } else {
        console.log('📖 Premier chargement : initialisation des carnets');
        this.initializeDefaultOrderBooks();
      }
    } catch (error) {
      console.error('❌ Erreur chargement localStorage carnets:', error);
      this.initializeDefaultOrderBooks();
    }
  }

  /**
   * ✅ Sauvegarder les carnets dans localStorage
   */
  private saveOrderBooksToStorage(): void {
    try {
      const current = this.orderBooks$.value;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(current));
      console.log('💾 Carnets sauvegardés dans localStorage');
    } catch (error) {
      console.error('❌ Erreur sauvegarde localStorage carnets:', error);
    }
  }

  // ===============================================================
  // 🔹 GESTION LOCALSTORAGE - MES ORDRES
  // ===============================================================

  /**
   * ✅ Charger MES ordres depuis localStorage
   */
  private loadMyOrdersFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.MY_ORDERS_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Reconvertir les timestamps en Date
        const orders = parsed.map((o: any) => ({
          ...o,
          timestamp: new Date(o.timestamp)
        }));
        this.myPendingOrders$.next(orders);
        console.log('📋 Mes ordres chargés depuis localStorage:', orders.length);
      } else {
        console.log('📋 Aucun ordre en attente');
      }
    } catch (error) {
      console.error('❌ Erreur chargement localStorage ordres:', error);
    }
  }

  /**
   * ✅ Sauvegarder MES ordres dans localStorage
   */
  private saveMyOrdersToStorage(): void {
    try {
      const orders = this.myPendingOrders$.value;
      localStorage.setItem(this.MY_ORDERS_KEY, JSON.stringify(orders));
      console.log('💾 Mes ordres sauvegardés:', orders.length);
    } catch (error) {
      console.error('❌ Erreur sauvegarde localStorage ordres:', error);
    }
  }

  // ===============================================================
  // 🔹 INITIALISATION DES CARNETS
  // ===============================================================

  /**
   * ✅ Initialise les carnets pour TOUS les symboles
   */
  private initializeDefaultOrderBooks(): void {
    const stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'PYPL', 'INTC', 'AMD'];
    const forex = ['EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP'];
    const metals = ['XAU/USD', 'XAG/USD', 'XPT/USD', 'XPD/USD'];
    const etfs = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VWO', 'EEM', 'GLD', 'SLV', 'TLT'];

    const allSymbols = [...stocks, ...forex, ...metals, ...etfs];
    const initial: Record<string, LocalOrderBook> = {};

    allSymbols.forEach(symbol => {
      let basePrice: number;
      
      if (metals.includes(symbol)) {
        if (symbol === 'XAU/USD') basePrice = 2000 + Math.random() * 100;
        else if (symbol === 'XAG/USD') basePrice = 25 + Math.random() * 5;
        else if (symbol === 'XPT/USD') basePrice = 1000 + Math.random() * 100;
        else basePrice = 1500 + Math.random() * 100;
      } else if (forex.includes(symbol)) {
        if (symbol.includes('JPY')) basePrice = 150 + Math.random() * 5;
        else basePrice = 1 + Math.random() * 0.5;
      } else {
        basePrice = 50 + Math.random() * 450;
      }

      initial[symbol] = this.generateOrderBook(basePrice, symbol);
    });

    this.orderBooks$.next(initial);
    this.saveOrderBooksToStorage(); // ✅ Sauvegarder immédiatement
    console.log(`📖 ${allSymbols.length} carnets initialisés et sauvegardés`);
  }

  /**
   * ✅ Génère un orderbook réaliste
   */
  private generateOrderBook(basePrice: number, symbol: string): LocalOrderBook {
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];

    let spreadPercent: number;
    if (symbol.includes('/')) {
      spreadPercent = 0.0001 + Math.random() * 0.0004;
    } else {
      spreadPercent = 0.0002 + Math.random() * 0.0008;
    }

    const tickSize = basePrice * spreadPercent;

    for (let i = 0; i < 5; i++) {
      const price = basePrice - (i + 1) * tickSize;
      const quantity = Math.floor(100 + Math.random() * 2000);
      bids.push({ 
        price: +price.toFixed(symbol.includes('/') ? 5 : 2), 
        quantity 
      });
    }

    for (let i = 0; i < 5; i++) {
      const price = basePrice + (i + 1) * tickSize;
      const quantity = Math.floor(100 + Math.random() * 2000);
      asks.push({ 
        price: +price.toFixed(symbol.includes('/') ? 5 : 2), 
        quantity 
      });
    }

    return {
      bids: bids.sort((a, b) => b.price - a.price),
      asks: asks.sort((a, b) => a.price - b.price),
      lastPrice: +basePrice.toFixed(symbol.includes('/') ? 5 : 2)
    };
  }

  // ===============================================================
  // 🔹 OPÉRATIONS SUR LES CARNETS
  // ===============================================================

  /**
   * ✅ Récupérer le carnet d'un symbole
   */
  getOrderBook(symbol: string): Observable<LocalOrderBook | null> {
    return new Observable(observer => {
      const book = this.orderBooks$.value[symbol];
      
      if (!book) {
        console.warn(`⚠️ Carnet inexistant pour ${symbol}, génération...`);
        const newPrice = 100 + Math.random() * 100;
        const newBook = this.generateOrderBook(newPrice, symbol);
        this.updateOrderBook(symbol, newBook);
        observer.next(newBook);
      } else {
        observer.next(book);
      }
      
      observer.complete();
    });
  }

  /**
   * ✅ Vérifie si un ordre LIMIT peut être exécuté immédiatement
   */
  canExecuteLimitOrder(symbol: string, side: 'BUY' | 'SELL', limitPrice: number): number | null {
    const book = this.orderBooks$.value[symbol];
    
    if (!book) return null;

    if (side === 'BUY') {
      if (book.asks.length > 0 && limitPrice >= book.asks[0].price) {
        return book.asks[0].price;
      }
    } else {
      if (book.bids.length > 0 && limitPrice <= book.bids[0].price) {
        return book.bids[0].price;
      }
    }

    return null;
  }

  /**
   * ✅ Ajouter un ordre LIMIT au carnet ET le tracker
   */
  addLimitOrder(
    symbol: string, 
    side: 'BUY' | 'SELL', 
    price: number, 
    quantity: number,
    userId?: string
  ): string {
    const books = this.orderBooks$.value;
    let book = books[symbol];

    if (!book) {
      console.warn(`⚠️ Création carnet pour ${symbol}`);
      book = this.generateOrderBook(price, symbol);
    }

    // Ajouter au carnet
    if (side === 'BUY') {
      const existingBid = book.bids.find(b => b.price === price);
      if (existingBid) {
        existingBid.quantity += quantity;
      } else {
        book.bids.push({ price, quantity });
        book.bids.sort((a, b) => b.price - a.price);
        if (book.bids.length > 10) book.bids = book.bids.slice(0, 10);
      }
    } else {
      const existingAsk = book.asks.find(a => a.price === price);
      if (existingAsk) {
        existingAsk.quantity += quantity;
      } else {
        book.asks.push({ price, quantity });
        book.asks.sort((a, b) => a.price - b.price);
        if (book.asks.length > 10) book.asks = book.asks.slice(0, 10);
      }
    }

    this.updateOrderBook(symbol, book);

    // ✅ Tracker MON ordre dans la liste séparée
    const orderId = `${symbol}-${side}-${Date.now()}`;
    const myOrder: PendingOrder = {
      id: orderId,
      userId: userId || 'anonymous',
      symbol,
      side,
      price,
      quantity,
      timestamp: new Date()
    };

    const currentOrders = this.myPendingOrders$.value;
    this.myPendingOrders$.next([...currentOrders, myOrder]);
    this.saveMyOrdersToStorage(); // ✅ Sauvegarder

    console.log(`✅ Ordre LIMIT ajouté et tracké: ${orderId}`);
    return orderId;
  }

  /**
   * ✅ Simuler l'exécution d'un ordre MARKET
   */
  executeMarketOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number): number {
    const books = this.orderBooks$.value;
    let book = books[symbol];

    if (!book) {
      console.error(`❌ Pas de carnet pour ${symbol}`);
      return 0;
    }

    let remainingQty = quantity;
    let totalCost = 0;
    let executedQty = 0;

    if (side === 'BUY') {
      while (remainingQty > 0 && book.asks.length > 0) {
        const bestAsk = book.asks[0];
        const fillQty = Math.min(remainingQty, bestAsk.quantity);
        
        totalCost += fillQty * bestAsk.price;
        executedQty += fillQty;
        remainingQty -= fillQty;
        bestAsk.quantity -= fillQty;

        if (bestAsk.quantity <= 0) {
          book.asks.shift();
        }

        book.lastPrice = bestAsk.price;
      }
    } else {
      while (remainingQty > 0 && book.bids.length > 0) {
        const bestBid = book.bids[0];
        const fillQty = Math.min(remainingQty, bestBid.quantity);
        
        totalCost += fillQty * bestBid.price;
        executedQty += fillQty;
        remainingQty -= fillQty;
        bestBid.quantity -= fillQty;

        if (bestBid.quantity <= 0) {
          book.bids.shift();
        }

        book.lastPrice = bestBid.price;
      }
    }

    this.updateOrderBook(symbol, book);

    const avgPrice = executedQty > 0 ? totalCost / executedQty : 0;
    console.log(`⚡ MARKET ${side} ${symbol}: ${executedQty}/${quantity} @ ${avgPrice.toFixed(2)}`);
    
    return avgPrice;
  }

  /**
   * ✅ Mettre à jour le carnet avec un nouveau prix
   * ⚠️ IMPORTANT : Ne modifie QUE le lastPrice, PAS les ordres existants !
   */
  updateMarketPrice(symbol: string, newPrice: number): void {
    const books = this.orderBooks$.value;
    let book = books[symbol];

    if (!book) {
      book = this.generateOrderBook(newPrice, symbol);
      this.updateOrderBook(symbol, book);
    } else {
      // ✅ CHANGEMENT : On met à jour SEULEMENT le lastPrice
      // On NE TOUCHE PAS aux ordres existants (bids/asks)
      book.lastPrice = +newPrice.toFixed(symbol.includes('/') ? 5 : 2);
      this.updateOrderBook(symbol, book);
    }
  }

  /**
   * ✅ Mettre à jour le carnet et sauvegarder
   */
  private updateOrderBook(symbol: string, book: LocalOrderBook): void {
    const updated = { ...this.orderBooks$.value };
    updated[symbol] = book;
    this.orderBooks$.next(updated);
    this.saveOrderBooksToStorage(); // ✅ Sauvegarder automatiquement
  }

  // ===============================================================
  // 🔹 GESTION DE MES ORDRES
  // ===============================================================

  /**
   * ✅ Récupérer MES ordres en attente
   */
  getMyPendingOrders(symbol?: string): Observable<PendingOrder[]> {
    return new Observable(observer => {
      const orders = this.myPendingOrders$.value;
      const filtered = symbol 
        ? orders.filter(o => o.symbol === symbol)
        : orders;
      observer.next(filtered);
      observer.complete();
    });
  }

  /**
   * ✅ Stream de MES ordres (pour s'abonner aux changements)
   */
  streamMyPendingOrders(): Observable<PendingOrder[]> {
    return this.myPendingOrders$.asObservable();
  }

  /**
   * ✅ Annuler un de MES ordres
   */
  cancelMyOrder(orderId: string): void {
    const orders = this.myPendingOrders$.value;
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      console.warn(`❌ Ordre ${orderId} introuvable`);
      return;
    }

    // Retirer du carnet
    const books = this.orderBooks$.value;
    const book = books[order.symbol];
    
    if (book) {
      if (order.side === 'BUY') {
        const idx = book.bids.findIndex(b => b.price === order.price);
        if (idx !== -1) {
          book.bids[idx].quantity -= order.quantity;
          if (book.bids[idx].quantity <= 0) {
            book.bids.splice(idx, 1);
          }
        }
      } else {
        const idx = book.asks.findIndex(a => a.price === order.price);
        if (idx !== -1) {
          book.asks[idx].quantity -= order.quantity;
          if (book.asks[idx].quantity <= 0) {
            book.asks.splice(idx, 1);
          }
        }
      }
      this.updateOrderBook(order.symbol, book);
    }

    // Retirer de mes ordres
    this.myPendingOrders$.next(orders.filter(o => o.id !== orderId));
    this.saveMyOrdersToStorage(); // ✅ Sauvegarder

    console.log(`🗑️ Ordre ${orderId} annulé`);
  }

  /**
   * ✅ Supprimer un ordre après exécution
   */
  removeMyOrder(orderId: string): void {
    const orders = this.myPendingOrders$.value;
    this.myPendingOrders$.next(orders.filter(o => o.id !== orderId));
    this.saveMyOrdersToStorage(); // ✅ Sauvegarder
    console.log(`✅ Ordre ${orderId} retiré (exécuté)`);
  }

  // ===============================================================
  // 🔹 UTILITAIRES
  // ===============================================================

  /**
   * ✅ Stream de tous les carnets
   */
  streamOrderBooks(): Observable<Record<string, LocalOrderBook>> {
    return this.orderBooks$.asObservable();
  }

  /**
   * ✅ Obtenir tous les symboles
   */
  getAllSymbols(): string[] {
    return Object.keys(this.orderBooks$.value);
  }

  /**
   * ✅ Stats du carnet
   */
  getBookStats(symbol: string): { bidLevels: number; askLevels: number; spread: number } | null {
    const book = this.orderBooks$.value[symbol];
    if (!book || book.bids.length === 0 || book.asks.length === 0) return null;

    const bestBid = book.bids[0].price;
    const bestAsk = book.asks[0].price;
    const spread = bestAsk - bestBid;

    return {
      bidLevels: book.bids.length,
      askLevels: book.asks.length,
      spread: +spread.toFixed(5)
    };
  }

  /**
   * ✅ Réinitialiser TOUT (pour debug/reset)
   */
  resetAll(): void {
    if (confirm('⚠️ Voulez-vous vraiment réinitialiser tous les carnets et ordres ?')) {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.MY_ORDERS_KEY);
      this.myPendingOrders$.next([]);
      this.initializeDefaultOrderBooks();
      console.log('🔄 Tout réinitialisé');
    }
  }

  /**
   * ✅ Effacer seulement MES ordres
   */
  clearMyOrders(): void {
    this.myPendingOrders$.next([]);
    localStorage.removeItem(this.MY_ORDERS_KEY);
    console.log('🧹 Mes ordres effacés');
  }
}