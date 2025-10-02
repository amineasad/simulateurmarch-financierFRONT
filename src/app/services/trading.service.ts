// src/app/services/trading.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Asset, Position, OrderBook } from '../models/market.model';

@Injectable({
  providedIn: 'root'
})
export class TradingService {
  private readonly API_URL = 'http://localhost:8080/api';

  // États observables
  private assets$ = new BehaviorSubject<Asset[]>([]);
  private portfolio$ = new BehaviorSubject<Position[]>([]);
  private cash$ = new BehaviorSubject<number>(100000);
  private selectedAsset$ = new BehaviorSubject<string>('AAPL');

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  /**
   * Charger les données initiales depuis le backend
   */
 private loadInitialData(): void {
  // MODE MOCK : Charger directement les données simulées
  this.loadMockData();
  
  // Pas d'appel HTTP pour l'instant
  // Les appels HTTP seront activés quand le backend sera prêt
}

  /**
   * Données mock pour le développement (avant que le backend soit prêt)
   */
  private loadMockData(): void {
    const mockAssets: Asset[] = [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 178.50, change: 2.34, volume: '45.2M', bid: 178.48, ask: 178.52 },
      { symbol: 'MSFT', name: 'Microsoft', price: 412.80, change: -1.20, volume: '23.1M', bid: 412.75, ask: 412.85 },
      { symbol: 'GOOGL', name: 'Alphabet', price: 142.15, change: 0.85, volume: '18.9M', bid: 142.10, ask: 142.20 },
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 238.45, change: -3.12, volume: '89.4M', bid: 238.40, ask: 238.50 },
      { symbol: 'AMZN', name: 'Amazon', price: 178.90, change: 1.65, volume: '34.2M', bid: 178.85, ask: 178.95 },
      { symbol: 'META', name: 'Meta', price: 485.20, change: 2.89, volume: '12.7M', bid: 485.15, ask: 485.25 }
    ];

    const mockPortfolio: Position[] = [
      { symbol: 'AAPL', quantity: 150, avgPrice: 165.20, currentPrice: 178.50 },
      { symbol: 'MSFT', quantity: 80, avgPrice: 380.50, currentPrice: 412.80 },
      { symbol: 'GOOGL', quantity: 200, avgPrice: 138.00, currentPrice: 142.15 }
    ];

    this.assets$.next(mockAssets);
    this.portfolio$.next(mockPortfolio);
  }

  /**
   * Mettre à jour le prix d'un asset
   */
  updateAssetPrice(symbol: string, newPrice: number, change: number): void {
    const currentAssets = this.assets$.value;
    const updatedAssets = currentAssets.map(asset => 
      asset.symbol === symbol 
        ? { ...asset, price: newPrice, change: change }
        : asset
    );
    this.assets$.next(updatedAssets);

    // Mettre à jour aussi le portfolio
    this.updatePortfolioPrices(symbol, newPrice);
  }

  /**
   * Mettre à jour les prix dans le portfolio
   */
  private updatePortfolioPrices(symbol: string, newPrice: number): void {
    const currentPortfolio = this.portfolio$.value;
    const updatedPortfolio = currentPortfolio.map(position =>
      position.symbol === symbol
        ? { ...position, currentPrice: newPrice }
        : position
    );
    this.portfolio$.next(updatedPortfolio);
  }

  /**
   * Ajouter une position au portfolio
   */
  addPosition(symbol: string, quantity: number, price: number): void {
    const currentPortfolio = this.portfolio$.value;
    const existingPosition = currentPortfolio.find(p => p.symbol === symbol);

    if (existingPosition) {
      // Mise à jour position existante
      const totalQuantity = existingPosition.quantity + quantity;
      const newAvgPrice = 
        ((existingPosition.avgPrice * existingPosition.quantity) + (price * quantity)) / totalQuantity;
      
      const updatedPortfolio = currentPortfolio.map(p =>
        p.symbol === symbol
          ? { ...p, quantity: totalQuantity, avgPrice: newAvgPrice }
          : p
      );
      this.portfolio$.next(updatedPortfolio);
    } else {
      // Nouvelle position
      const asset = this.getAsset(symbol);
      const newPosition: Position = {
        symbol: symbol,
        quantity: quantity,
        avgPrice: price,
        currentPrice: asset?.price || price
      };
      this.portfolio$.next([...currentPortfolio, newPosition]);
    }
  }

  /**
   * Retirer une position du portfolio
   */
  removePosition(symbol: string, quantity: number): void {
    const currentPortfolio = this.portfolio$.value;
    const updatedPortfolio = currentPortfolio
      .map(p => p.symbol === symbol ? { ...p, quantity: p.quantity - quantity } : p)
      .filter(p => p.quantity > 0);
    
    this.portfolio$.next(updatedPortfolio);
  }

  /**
   * Mettre à jour le cash
   */
  updateCash(amount: number): void {
    this.cash$.next(this.cash$.value + amount);
  }

  /**
   * Sélectionner un asset
   */
  selectAsset(symbol: string): void {
    this.selectedAsset$.next(symbol);
  }

  /**
   * Getters pour les observables
   */
  getAssets(): Observable<Asset[]> {
    return this.assets$.asObservable();
  }

  getPortfolio(): Observable<Position[]> {
    return this.portfolio$.asObservable();
  }

  getCash(): Observable<number> {
    return this.cash$.asObservable();
  }

  getSelectedAsset(): Observable<string> {
    return this.selectedAsset$.asObservable();
  }

  /**
   * Getters pour les valeurs actuelles
   */
  getAsset(symbol: string): Asset | undefined {
    return this.assets$.value.find(a => a.symbol === symbol);
  }

  getCurrentCash(): number {
    return this.cash$.value;
  }

  getPosition(symbol: string): Position | undefined {
    return this.portfolio$.value.find(p => p.symbol === symbol);
  }

  /**
   * Calculer la valeur totale du portfolio
   */
  getTotalPortfolioValue(): number {
    return this.portfolio$.value.reduce((sum, position) => 
      sum + (position.quantity * position.currentPrice), 0
    );
  }

  /**
   * Calculer le P&L total
   */
  getTotalPnL(): number {
    return this.portfolio$.value.reduce((sum, position) => 
      sum + (position.quantity * (position.currentPrice - position.avgPrice)), 0
    );
  }

  /**
   * Récupérer le carnet d'ordres pour un symbole
   */
  getOrderBook(symbol: string): Observable<OrderBook> {
    return this.http.get<OrderBook>(`${this.API_URL}/orderbook/${symbol}`);
  }
}