// ====================================================================
// src/app/services/local-orderbook.service.ts - VERSION CORRIGÉE
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

export interface PendingOrder {
  id: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  timestamp: Date;
}

// ✅ NOUVEAU : Interface pour les trades exécutés
export interface ExecutedTrade {
  id: string;
  symbol: string;
  buyUserId: string;
  sellUserId: string;
  price: number;
  quantity: number;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class LocalOrderBookService {
  private orderBooks$ = new BehaviorSubject<Record<string, LocalOrderBook>>({});
  private myPendingOrders$ = new BehaviorSubject<PendingOrder[]>([]);
  
  // ✅ NOUVEAU : Stream des trades exécutés
  private executedTrades$ = new BehaviorSubject<ExecutedTrade[]>([]);
  
  private readonly STORAGE_KEY = 'tradix_orderbooks_v2';
  private readonly MY_ORDERS_KEY = 'tradix_my_orders_v2';
  private readonly TRADES_KEY = 'tradix_executed_trades_v2';

  constructor() {
    console.log('📚 LocalOrderBookService initialisé');
    this.loadOrderBooksFromStorage();
    this.loadMyOrdersFromStorage();
    this.loadExecutedTrades();
  }

  // ===============================================================
  // 🔹 GESTION LOCALSTORAGE - CARNETS D'ORDRES
  // ===============================================================

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

  private loadMyOrdersFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.MY_ORDERS_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
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
  // 🔹 GESTION LOCALSTORAGE - TRADES EXÉCUTÉS
  // ===============================================================

  private loadExecutedTrades(): void {
    try {
      const stored = localStorage.getItem(this.TRADES_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        const trades = parsed.map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp)
        }));
        this.executedTrades$.next(trades);
        console.log('📊 Trades chargés:', trades.length);
      }
    } catch (error) {
      console.error('❌ Erreur chargement trades:', error);
    }
  }

  private saveExecutedTrades(): void {
    try {
      const trades = this.executedTrades$.value;
      localStorage.setItem(this.TRADES_KEY, JSON.stringify(trades));
      console.log('💾 Trades sauvegardés:', trades.length);
    } catch (error) {
      console.error('❌ Erreur sauvegarde trades:', error);
    }
  }

  // ===============================================================
  // 🔹 INITIALISATION DES CARNETS
  // ===============================================================

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
    this.saveOrderBooksToStorage();
    console.log(`📖 ${allSymbols.length} carnets initialisés et sauvegardés`);
  }

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
    const decimals = symbol.includes('/') ? 5 : 2;

    for (let i = 0; i < 5; i++) {
      const price = basePrice - (i + 1) * tickSize;
      const quantity = Math.floor(100 + Math.random() * 2000);
      bids.push({ 
        price: +price.toFixed(decimals), 
        quantity 
      });
    }

    for (let i = 0; i < 5; i++) {
      const price = basePrice + (i + 1) * tickSize;
      const quantity = Math.floor(100 + Math.random() * 2000);
      asks.push({ 
        price: +price.toFixed(decimals), 
        quantity 
      });
    }

    return {
      bids: bids.sort((a, b) => b.price - a.price),
      asks: asks.sort((a, b) => a.price - b.price),
      lastPrice: +basePrice.toFixed(decimals)
    };
  }

  // ===============================================================
  // 🔹 OPÉRATIONS SUR LES CARNETS
  // ===============================================================

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
   * ✅ NOUVEAU : Vérifier et exécuter les matchs entre ordres
   * Retourne les ordres exécutés pour notifier les users
   */
  private checkAndExecuteMatches(symbol: string): { buyOrderId: string; sellOrderId: string; buyUserId: string; sellUserId: string; price: number; quantity: number }[] {
    const books = this.orderBooks$.value;
    const book = books[symbol];
    const matches: { buyOrderId: string; sellOrderId: string; buyUserId: string; sellUserId: string; price: number; quantity: number }[] = [];

    if (!book || book.bids.length === 0 || book.asks.length === 0) {
      return matches;
    }

    // Tant qu'il y a des ordres qui peuvent matcher
    while (book.bids.length > 0 && book.asks.length > 0) {
      const bestBid = book.bids[0];
      const bestAsk = book.asks[0];

      // ✅ Si le meilleur BID >= meilleur ASK → MATCH !
      if (bestBid.price >= bestAsk.price) {
        const matchPrice = bestAsk.price; // Prix d'exécution = prix du vendeur
        const matchQty = Math.min(bestBid.quantity, bestAsk.quantity);

        console.log(`🔥 MATCH trouvé pour ${symbol}: ${matchQty} @ ${matchPrice}€`);

        // Récupérer les IDs des ordres et des users
        const buyOrderId = (bestBid as any).userOrderId || 'market';
        const sellOrderId = (bestAsk as any).userOrderId || 'market';
        
        // Récupérer les userId depuis myPendingOrders
        const buyOrder = this.myPendingOrders$.value.find(o => o.id === buyOrderId);
        const sellOrder = this.myPendingOrders$.value.find(o => o.id === sellOrderId);

        const buyUserId = buyOrder?.userId || 'anonymous';
        const sellUserId = sellOrder?.userId || 'anonymous';

        matches.push({
          buyOrderId,
          sellOrderId,
          buyUserId,
          sellUserId,
          price: matchPrice,
          quantity: matchQty
        });

        // ✅ Enregistrer le trade
        const trade: ExecutedTrade = {
          id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          buyUserId,
          sellUserId,
          price: matchPrice,
          quantity: matchQty,
          timestamp: new Date()
        };

        const currentTrades = this.executedTrades$.value;
        this.executedTrades$.next([trade, ...currentTrades]);
        this.saveExecutedTrades();

        // ✅ Retirer les ordres exécutés de myPendingOrders
        if (buyOrder) {
          this.removeMyOrder(buyOrderId);
        }
        if (sellOrder) {
          this.removeMyOrder(sellOrderId);
        }

        // Réduire les quantités
        bestBid.quantity -= matchQty;
        bestAsk.quantity -= matchQty;

        // Supprimer si quantité = 0
        if (bestBid.quantity <= 0) {
          book.bids.shift();
        }
        if (bestAsk.quantity <= 0) {
          book.asks.shift();
        }

        // Mettre à jour le lastPrice
        book.lastPrice = matchPrice;
      } else {
        // Plus de match possible
        break;
      }
    }

    if (matches.length > 0) {
      this.updateOrderBook(symbol, book);
    }

    return matches;
  }

  /**
   * ✅ MODIFIÉ : Retourne les matches pour notification
   */
  addLimitOrder(
    symbol: string, 
    side: 'BUY' | 'SELL', 
    price: number, 
    quantity: number,
    userId?: string
  ): { orderId: string; matches: any[] } {
    const books = this.orderBooks$.value;
    let book = books[symbol];

    if (!book) {
      console.warn(`⚠️ Création carnet pour ${symbol}`);
      book = this.generateOrderBook(price, symbol);
    }

    const orderId = `${symbol}-${side}-${Date.now()}`;
    
    if (side === 'BUY') {
      const existingBid = book.bids.find(b => b.price === price);
      if (existingBid) {
        existingBid.quantity += quantity;
        (existingBid as any).userOrderId = orderId;
      } else {
        const newBid: any = { price, quantity, userOrderId: orderId };
        book.bids.push(newBid);
        book.bids.sort((a, b) => b.price - a.price);
        if (book.bids.length > 10) {
          book.bids = book.bids.filter((b: any) => b.userOrderId || book.bids.indexOf(b) < 10);
        }
      }
    } else {
      const existingAsk = book.asks.find(a => a.price === price);
      if (existingAsk) {
        existingAsk.quantity += quantity;
        (existingAsk as any).userOrderId = orderId;
      } else {
        const newAsk: any = { price, quantity, userOrderId: orderId };
        book.asks.push(newAsk);
        book.asks.sort((a, b) => a.price - b.price);
        if (book.asks.length > 10) {
          book.asks = book.asks.filter((a: any) => a.userOrderId || book.asks.indexOf(a) < 10);
        }
      }
    }

    this.updateOrderBook(symbol, book);

    // ✅ Tracker MON ordre
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
    this.saveMyOrdersToStorage();

    console.log(`✅ Ordre LIMIT ajouté: ${orderId}`);

    // ✅ NOUVEAU : Vérifier les matchs automatiques
    const matches = this.checkAndExecuteMatches(symbol);

    return { orderId, matches };
  }

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
   * ✅ LOGIQUE HYBRIDE : Ajuste progressivement les prix sans tout régénérer
   */
  updateMarketPrice(symbol: string, newPrice: number): void {
    const books = this.orderBooks$.value;
    let book = books[symbol];

    if (!book) {
      book = this.generateOrderBook(newPrice, symbol);
      this.updateOrderBook(symbol, book);
      return;
    }

    const decimals = symbol.includes('/') ? 5 : 2;
    const oldPrice = book.lastPrice;
    const priceDiff = Math.abs(newPrice - oldPrice);
    const changePercent = (priceDiff / oldPrice) * 100;

    // ✅ Si changement < 0.5%, on garde les ordres et on ajuste juste le lastPrice
    if (changePercent < 0.5) {
      book.lastPrice = +newPrice.toFixed(decimals);
      this.updateOrderBook(symbol, book);
      return;
    }

    // ✅ Si changement > 0.5%, on ajuste progressivement les prix
    let spreadPercent: number;
    if (symbol.includes('/')) {
      spreadPercent = 0.0001 + Math.random() * 0.0004;
    } else {
      spreadPercent = 0.0002 + Math.random() * 0.0008;
    }

    const tickSize = newPrice * spreadPercent;

    // ✅ Ajuster les BIDs : déplacer vers le nouveau prix
    const adjustedBids: OrderBookEntry[] = book.bids.map((bid, i) => {
      const targetPrice = newPrice - (i + 1) * tickSize;
      // Moyenne entre ancien et nouveau prix pour transition douce
      const adjustedPrice = (bid.price + targetPrice) / 2;
      return {
        price: +adjustedPrice.toFixed(decimals),
        quantity: bid.quantity
      };
    });

    // ✅ Ajuster les ASKs : déplacer vers le nouveau prix
    const adjustedAsks: OrderBookEntry[] = book.asks.map((ask, i) => {
      const targetPrice = newPrice + (i + 1) * tickSize;
      const adjustedPrice = (ask.price + targetPrice) / 2;
      return {
        price: +adjustedPrice.toFixed(decimals),
        quantity: ask.quantity
      };
    });

    book.bids = adjustedBids.sort((a, b) => b.price - a.price);
    book.asks = adjustedAsks.sort((a, b) => a.price - b.price);
    book.lastPrice = +newPrice.toFixed(decimals);

    this.updateOrderBook(symbol, book);
  }

  private updateOrderBook(symbol: string, book: LocalOrderBook): void {
    const updated = { ...this.orderBooks$.value };
    updated[symbol] = book;
    this.orderBooks$.next(updated);
    this.saveOrderBooksToStorage();
  }

  // ===============================================================
  // 🔹 GESTION DE MES ORDRES
  // ===============================================================

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

  streamMyPendingOrders(): Observable<PendingOrder[]> {
    return this.myPendingOrders$.asObservable();
  }

  cancelMyOrder(orderId: string): void {
    const orders = this.myPendingOrders$.value;
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      console.warn(`❌ Ordre ${orderId} introuvable`);
      return;
    }

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

    this.myPendingOrders$.next(orders.filter(o => o.id !== orderId));
    this.saveMyOrdersToStorage();

    console.log(`🗑️ Ordre ${orderId} annulé`);
  }

  removeMyOrder(orderId: string): void {
    const orders = this.myPendingOrders$.value;
    this.myPendingOrders$.next(orders.filter(o => o.id !== orderId));
    this.saveMyOrdersToStorage();
    console.log(`✅ Ordre ${orderId} retiré (exécuté)`);
  }

  // ===============================================================
  // 🔹 UTILITAIRES
  // ===============================================================

  streamOrderBooks(): Observable<Record<string, LocalOrderBook>> {
    return this.orderBooks$.asObservable();
  }

  getAllSymbols(): string[] {
    return Object.keys(this.orderBooks$.value);
  }

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

  resetAll(): void {
    if (confirm('⚠️ Voulez-vous vraiment réinitialiser tous les carnets et ordres ?')) {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.MY_ORDERS_KEY);
      this.myPendingOrders$.next([]);
      this.initializeDefaultOrderBooks();
      console.log('🔄 Tout réinitialisé');
    }
  }

  clearMyOrders(): void {
    this.myPendingOrders$.next([]);
    localStorage.removeItem(this.MY_ORDERS_KEY);
    console.log('🧹 Mes ordres effacés');
  }

  /**
   * ✅ Récupérer les trades exécutés pour un user
   */
  getMyExecutedTrades(userId: string): Observable<ExecutedTrade[]> {
    return new Observable(observer => {
      const trades = this.executedTrades$.value.filter(
        t => t.buyUserId === userId || t.sellUserId === userId
      );
      observer.next(trades);
      observer.complete();
    });
  }

  /**
   * ✅ Stream des trades exécutés
   */
  streamExecutedTrades(): Observable<ExecutedTrade[]> {
    return this.executedTrades$.asObservable();
  }
}