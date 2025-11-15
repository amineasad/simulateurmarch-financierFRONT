// ====================================================================
// src/app/services/local-orderbook.service.ts - VERSION RÉALISTE
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

@Injectable({ providedIn: 'root' })
export class LocalOrderBookService {
  private orderBooks$ = new BehaviorSubject<Record<string, LocalOrderBook>>({});

  constructor() {
    console.log('📚 LocalOrderBookService initialisé');
    this.initializeDefaultOrderBooks();
  }

  /**
   * ✅ Initialise les carnets pour TOUS les symboles de toutes les catégories
   */
  private initializeDefaultOrderBooks(): void {
    // ACTIONS (Stocks)
    const stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'PYPL', 'INTC', 'AMD'];
    
    // DEVISES (Forex) - Format: "EUR/USD"
    const forex = ['EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP'];
    
    // MÉTAUX - Format: "XAU/USD"
    const metals = ['XAU/USD', 'XAG/USD', 'XPT/USD', 'XPD/USD'];
    
    // ETF
    const etfs = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VWO', 'EEM', 'GLD', 'SLV', 'TLT'];

    const allSymbols = [...stocks, ...forex, ...metals, ...etfs];
    const initial: Record<string, LocalOrderBook> = {};

    allSymbols.forEach(symbol => {
      // Prix de base différent selon le type
      let basePrice: number;
      
      if (metals.includes(symbol)) {
        // Métaux : prix plus élevés (or ~2000, argent ~25, etc.)
        if (symbol === 'XAU/USD') basePrice = 2000 + Math.random() * 100;
        else if (symbol === 'XAG/USD') basePrice = 25 + Math.random() * 5;
        else if (symbol === 'XPT/USD') basePrice = 1000 + Math.random() * 100;
        else basePrice = 1500 + Math.random() * 100;
      } else if (forex.includes(symbol)) {
        // Devises : prix autour de 1 (sauf JPY ~150)
        if (symbol.includes('JPY')) basePrice = 150 + Math.random() * 5;
        else basePrice = 1 + Math.random() * 0.5;
      } else {
        // Actions et ETF : 50-500
        basePrice = 50 + Math.random() * 450;
      }

      initial[symbol] = this.generateOrderBook(basePrice, symbol);
    });

    this.orderBooks$.next(initial);
    console.log(`📖 ${allSymbols.length} carnets d'ordres initialisés`);
  }

  /**
   * ✅ Génère un orderbook réaliste autour d'un prix de base
   */
  private generateOrderBook(basePrice: number, symbol: string): LocalOrderBook {
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];

    // Spread adapté au type d'actif
    let spreadPercent: number;
    if (symbol.includes('/')) {
      // Forex/Métaux : spread très serré (0.01-0.05%)
      spreadPercent = 0.0001 + Math.random() * 0.0004;
    } else {
      // Actions/ETF : spread normal (0.02-0.1%)
      spreadPercent = 0.0002 + Math.random() * 0.0008;
    }

    const tickSize = basePrice * spreadPercent;

    // Générer 5 niveaux de BID (prix décroissants)
    for (let i = 0; i < 5; i++) {
      const price = basePrice - (i + 1) * tickSize;
      const quantity = Math.floor(100 + Math.random() * 2000);
      bids.push({ 
        price: +price.toFixed(symbol.includes('/') ? 5 : 2), 
        quantity 
      });
    }

    // Générer 5 niveaux de ASK (prix croissants)
    for (let i = 0; i < 5; i++) {
      const price = basePrice + (i + 1) * tickSize;
      const quantity = Math.floor(100 + Math.random() * 2000);
      asks.push({ 
        price: +price.toFixed(symbol.includes('/') ? 5 : 2), 
        quantity 
      });
    }

    return {
      bids: bids.sort((a, b) => b.price - a.price), // Décroissant
      asks: asks.sort((a, b) => a.price - b.price),  // Croissant
      lastPrice: +basePrice.toFixed(symbol.includes('/') ? 5 : 2)
    };
  }

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
   * ✅ NOUVEAU : Vérifie si un ordre LIMIT peut être exécuté immédiatement
   * Retourne le prix d'exécution ou null si l'ordre doit être ajouté au carnet
   */
  canExecuteLimitOrder(symbol: string, side: 'BUY' | 'SELL', limitPrice: number): number | null {
    const book = this.orderBooks$.value[symbol];
    
    if (!book) return null;

    if (side === 'BUY') {
      // Pour un BUY : vérifier si le prix limite >= meilleur ASK
      if (book.asks.length > 0 && limitPrice >= book.asks[0].price) {
        // Ordre exécutable immédiatement au prix du marché
        return book.asks[0].price;
      }
    } else {
      // Pour un SELL : vérifier si le prix limite <= meilleur BID
      if (book.bids.length > 0 && limitPrice <= book.bids[0].price) {
        // Ordre exécutable immédiatement au prix du marché
        return book.bids[0].price;
      }
    }

    // L'ordre doit être ajouté au carnet (pas exécutable immédiatement)
    return null;
  }

  /**
   * ✅ Ajouter un ordre LIMIT au carnet
   */
  addLimitOrder(symbol: string, side: 'BUY' | 'SELL', price: number, quantity: number): void {
    const books = this.orderBooks$.value;
    let book = books[symbol];

    if (!book) {
      console.warn(`⚠️ Création carnet pour ${symbol}`);
      book = this.generateOrderBook(price, symbol);
    }

    if (side === 'BUY') {
      const existingBid = book.bids.find(b => b.price === price);
      if (existingBid) {
        existingBid.quantity += quantity;
      } else {
        book.bids.push({ price, quantity });
        book.bids.sort((a, b) => b.price - a.price);
        // Limiter à 10 niveaux max
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
    console.log(`✅ Ordre LIMIT ajouté: ${side} ${quantity} ${symbol} @ ${price}`);
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
      // Consommer les ASKs
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
      // Consommer les BIDs
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
   * ✅ Mettre à jour le carnet avec un nouveau prix de marché
   */
  updateMarketPrice(symbol: string, newPrice: number): void {
    const books = this.orderBooks$.value;
    let book = books[symbol];

    if (!book) {
      book = this.generateOrderBook(newPrice, symbol);
    } else {
      // Recalculer le carnet autour du nouveau prix
      const spreadPercent = symbol.includes('/') ? 0.0002 : 0.0005;
      const tickSize = newPrice * spreadPercent;
      
      // Ajuster les BIDs
      book.bids = book.bids.map((b, i) => ({
        price: +(newPrice - (i + 1) * tickSize).toFixed(symbol.includes('/') ? 5 : 2),
        quantity: Math.max(50, b.quantity + Math.floor(Math.random() * 100 - 50)) // Variation aléatoire
      }));

      // Ajuster les ASKs
      book.asks = book.asks.map((a, i) => ({
        price: +(newPrice + (i + 1) * tickSize).toFixed(symbol.includes('/') ? 5 : 2),
        quantity: Math.max(50, a.quantity + Math.floor(Math.random() * 100 - 50))
      }));

      book.lastPrice = +newPrice.toFixed(symbol.includes('/') ? 5 : 2);
    }

    this.updateOrderBook(symbol, book);
  }

  /**
   * ✅ Mettre à jour le carnet (et notifier les observateurs)
   */
  private updateOrderBook(symbol: string, book: LocalOrderBook): void {
    const updated = { ...this.orderBooks$.value };
    updated[symbol] = book;
    this.orderBooks$.next(updated);
  }

  /**
   * ✅ Stream de tous les carnets (pour debug)
   */
  streamOrderBooks(): Observable<Record<string, LocalOrderBook>> {
    return this.orderBooks$.asObservable();
  }

  /**
   * ✅ Obtenir tous les symboles avec carnets
   */
  getAllSymbols(): string[] {
    return Object.keys(this.orderBooks$.value);
  }

  /**
   * ✅ Stats du carnet (pour debug)
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
}