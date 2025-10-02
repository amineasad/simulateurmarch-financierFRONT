// src/app/services/websocket.service.ts

import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private connected$ = new BehaviorSubject<boolean>(true); // ← true directement
  private marketUpdates$ = new Subject<any>();
  private chatMessages$ = new Subject<any>();
  
  constructor() {
    console.log('🔧 WebSocket Service en mode MOCK (pas de backend nécessaire)');
  }

  connect(): Promise<void> {
    return new Promise((resolve) => {
      console.log('✅ Mode MOCK activé - Backend non requis');
      this.connected$.next(true);
      
      // Simuler des mises à jour de prix toutes les 5 secondes
      setInterval(() => {
        const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'META'];
        const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        const mockUpdate = {
          symbol: randomSymbol,
          price: 150 + Math.random() * 100,
          change: (Math.random() - 0.5) * 5,
          message: 'Mise à jour du prix (simulé)'
        };
        this.marketUpdates$.next(mockUpdate);
      }, 5000);
      
      resolve();
    });
  }

  sendOrder(order: any): void {
    console.log('📤 Ordre envoyé (mode MOCK):', order);
    
    // Simuler une réponse après 1 seconde
    setTimeout(() => {
      const response = {
        symbol: order.symbol,
        price: order.price,
        executedOrder: { 
          ...order, 
          id: 'ORDER-' + Date.now(),
          status: 'EXECUTED',
          timestamp: new Date()
        },
        message: `✅ Ordre ${order.side} de ${order.quantity} ${order.symbol} exécuté à ${order.price}€`
      };
      this.marketUpdates$.next(response);
    }, 1000);
  }

  sendChatMessage(message: string, username: string): void {
    console.log('💬 Message chat (mode MOCK):', message);
    const chatMsg = {
      user: username,
      message: message,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    this.chatMessages$.next(chatMsg);
  }

  getMarketUpdates(): Observable<any> {
    return this.marketUpdates$.asObservable();
  }

  getChatMessages(): Observable<any> {
    return this.chatMessages$.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  disconnect(): void {
    console.log('🔌 Déconnexion (mode MOCK)');
    this.connected$.next(false);
  }

  isConnected(): boolean {
    return this.connected$.value;
  }
}