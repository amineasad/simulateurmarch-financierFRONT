// src/app/services/websocket.service.ts
import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private connected$ = new BehaviorSubject<boolean>(true);
  private marketUpdates$ = new Subject<any>();  // on peut garder ce flux pour les accusés d'exécution
  private chatMessages$ = new Subject<any>();

  constructor() {
    console.log('🔧 WebSocket Service en mode MOCK (pas de backend nécessaire)');
  }

  connect(): Promise<void> {
    return new Promise((resolve) => {
      console.log('✅ Mode MOCK activé - Backend non requis');
      this.connected$.next(true);

      // ❌ SUPPRIMER / COMMENTER le setInterval qui envoyait des PRIX MOCK
      // setInterval(() => {
      //   const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN', 'META'];
      //   const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      //   const mockUpdate = {
      //     symbol: randomSymbol,
      //     price: 150 + Math.random() * 100,
      //     change: (Math.random() - 0.5) * 5,
      //     message: 'Mise à jour du prix (simulé)'
      //   };
      //   this.marketUpdates$.next(mockUpdate);
      // }, 5000);

      resolve();
    });
  }

  sendOrder(order: any): void {
    console.log('📤 Ordre envoyé (mode MOCK):', order);
    // ✅ On peut garder l’accusé d’exécution (ça NE met pas à jour les prix)
    setTimeout(() => {
      const response = {
        // pas besoin d'un "price" global ici pour ne pas confondre avec un prix temps réel
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
    return this.marketUpdates$.asObservable(); // ⚠️ désormais, ce flux sert juste aux "executedOrder"
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
