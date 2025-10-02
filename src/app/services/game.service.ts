// src/app/services/game.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, interval } from 'rxjs';
import { GameRoom, Player, Leaderboard, GameEvent, ChatMessage } from '../models/game.model';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private readonly API_URL = 'http://localhost:8081/api/game';
  
  // États observables
  private currentRoom$ = new BehaviorSubject<GameRoom | null>(null);
  private leaderboard$ = new BehaviorSubject<Player[]>([]);
  private timeRemaining$ = new BehaviorSubject<number>(0);
  private gameEvents$ = new Subject<GameEvent>();
  private chatMessages$ = new BehaviorSubject<ChatMessage[]>([]);

  constructor(private http: HttpClient) {}

  // ============================================
  // GESTION DES SALLES
  // ============================================

  /**
   * Récupérer toutes les salles disponibles
   */
  getRooms(): Observable<GameRoom[]> {
    // VERSION MOCK (pour l'instant)
    const mockRooms: GameRoom[] = [
      {
        id: '1',
        name: '🔴 Crise 2008 - Challenge',
        scenario: 'CRASH_2008',
        difficulty: 'HARD',
        maxPlayers: 20,
        currentPlayers: 8,
        duration: 60,
        initialBudget: 100000,
        status: 'WAITING',
        createdAt: new Date(Date.now() - 300000)
      },
      {
        id: '2',
        name: '🟢 Marché Normal',
        scenario: 'NORMAL',
        difficulty: 'EASY',
        maxPlayers: 30,
        currentPlayers: 15,
        duration: 30,
        initialBudget: 50000,
        status: 'IN_PROGRESS',
        createdAt: new Date(Date.now() - 600000),
        startedAt: new Date(Date.now() - 300000)
      },
      {
        id: '3',
        name: '⚡ Haute Volatilité',
        scenario: 'VOLATILE',
        difficulty: 'MEDIUM',
        maxPlayers: 15,
        currentPlayers: 7,
        duration: 45,
        initialBudget: 75000,
        status: 'WAITING',
        createdAt: new Date(Date.now() - 180000)
      },
      {
        id: '4',
        name: '🦠 Pandémie COVID-20',
        scenario: 'COVID_2020',
        difficulty: 'HARD',
        maxPlayers: 25,
        currentPlayers: 12,
        duration: 90,
        initialBudget: 150000,
        status: 'IN_PROGRESS',
        createdAt: new Date(Date.now() - 900000),
        startedAt: new Date(Date.now() - 600000)
      }
    ];

    // Simuler un délai réseau
    return new Observable(observer => {
      setTimeout(() => {
        observer.next(mockRooms);
        observer.complete();
      }, 500);
    });

    // VERSION BACKEND (à activer plus tard)
    // return this.http.get<GameRoom[]>(`${this.API_URL}/rooms`);
  }

  /**
   * Créer une nouvelle salle
   */
  createRoom(config: Partial<GameRoom>): Observable<GameRoom> {
    // VERSION MOCK
    const newRoom: GameRoom = {
      id: Date.now().toString(),
      name: config.name || 'Nouvelle Salle',
      scenario: config.scenario || 'NORMAL',
      difficulty: config.difficulty || 'MEDIUM',
      maxPlayers: config.maxPlayers || 20,
      currentPlayers: 1,
      duration: config.duration || 30,
      initialBudget: config.initialBudget || 100000,
      status: 'WAITING',
      createdAt: new Date()
    };

    return new Observable(observer => {
      setTimeout(() => {
        this.currentRoom$.next(newRoom);
        observer.next(newRoom);
        observer.complete();
      }, 500);
    });

    // VERSION BACKEND (à activer plus tard)
    // return this.http.post<GameRoom>(`${this.API_URL}/rooms`, config);
  }

  /**
   * Rejoindre une salle
   */
  joinRoom(roomId: string, username: string): Observable<any> {
    // VERSION MOCK
    return new Observable(observer => {
      setTimeout(() => {
        console.log(`✅ ${username} a rejoint la salle ${roomId}`);
        
        // Simuler le chargement de la salle
        this.loadMockRoomData(roomId);
        
        observer.next({ success: true, roomId: roomId });
        observer.complete();
      }, 800);
    });

    // VERSION BACKEND (à activer plus tard)
    // return this.http.post(`${this.API_URL}/rooms/${roomId}/join`, { username });
  }

  /**
   * Quitter la salle actuelle
   */
  leaveRoom(roomId: string): Observable<any> {
    // VERSION MOCK
    this.currentRoom$.next(null);
    this.leaderboard$.next([]);
    this.timeRemaining$.next(0);
    this.chatMessages$.next([]);

    return new Observable(observer => {
      setTimeout(() => {
        observer.next({ success: true });
        observer.complete();
      }, 300);
    });

    // VERSION BACKEND (à activer plus tard)
    // return this.http.post(`${this.API_URL}/rooms/${roomId}/leave`, {});
  }

  // ============================================
  // CLASSEMENT
  // ============================================

  /**
   * Observer le classement
   */
  getLeaderboard(): Observable<Player[]> {
    return this.leaderboard$.asObservable();
  }

  /**
   * Mettre à jour le classement (appelé par WebSocket)
   */
  updateLeaderboard(players: Player[]): void {
    this.leaderboard$.next(players);
  }

  // ============================================
  // TIMER
  // ============================================

  /**
   * Observer le temps restant
   */
  getTimeRemaining(): Observable<number> {
    return this.timeRemaining$.asObservable();
  }

  /**
   * Démarrer le timer
   */
  startTimer(durationMinutes: number): void {
    let seconds = durationMinutes * 60;
    this.timeRemaining$.next(seconds);

    const timer = interval(1000).subscribe(() => {
      seconds--;
      this.timeRemaining$.next(seconds);

      if (seconds <= 0) {
        timer.unsubscribe();
        this.onGameFinished();
      }
    });
  }

  private onGameFinished(): void {
    console.log('🏁 Session terminée !');
    // Afficher un modal de fin de jeu, etc.
  }

  // ============================================
  // ÉVÉNEMENTS
  // ============================================

  /**
   * Observer les événements du jeu
   */
  getGameEvents(): Observable<GameEvent> {
    return this.gameEvents$.asObservable();
  }

  /**
   * Déclencher un événement (appelé par WebSocket)
   */
  triggerEvent(event: GameEvent): void {
    this.gameEvents$.next(event);
  }

  // ============================================
  // CHAT
  // ============================================

  /**
   * Observer les messages du chat
   */
  getChatMessages(): Observable<ChatMessage[]> {
    return this.chatMessages$.asObservable();
  }

  /**
   * Ajouter un message au chat
   */
  addChatMessage(message: ChatMessage): void {
    const messages = this.chatMessages$.value;
    messages.push(message);
    this.chatMessages$.next(messages);
  }

  /**
   * Envoyer un message (sera connecté au WebSocket plus tard)
   */
  sendChatMessage(roomId: string, message: string, username: string): void {
    const chatMsg: ChatMessage = {
      id: Date.now().toString(),
      roomId: roomId,
      userId: 'current-user',
      username: username,
      message: message,
      timestamp: new Date(),
      type: 'USER'
    };

    this.addChatMessage(chatMsg);

    // VERSION BACKEND (à activer plus tard)
    // this.wsService.send('/app/game/chat', chatMsg);
  }

  // ============================================
  // DONNÉES MOCK POUR TESTS
  // ============================================

  private loadMockRoomData(roomId: string): void {
    // Charger des données simulées
    const mockPlayers: Player[] = [
      {
        id: '1',
        username: 'Mike_Pro',
        portfolioValue: 115250,
        cash: 25000,
        rank: 1,
        pnl: 15250,
        pnlPercent: 15.25,
        isOnline: true,
        joinedAt: new Date(Date.now() - 1800000)
      },
      {
        id: '2',
        username: 'Sarah_Trader',
        portfolioValue: 112100,
        cash: 18000,
        rank: 2,
        pnl: 12100,
        pnlPercent: 12.10,
        isOnline: true,
        joinedAt: new Date(Date.now() - 1500000)
      },
      {
        id: '3',
        username: 'VOUS',
        portfolioValue: 108500,
        cash: 32000,
        rank: 3,
        pnl: 8500,
        pnlPercent: 8.50,
        isOnline: true,
        joinedAt: new Date()
      },
      {
        id: '4',
        username: 'Alex_Bot',
        portfolioValue: 103200,
        cash: 15000,
        rank: 4,
        pnl: 3200,
        pnlPercent: 3.20,
        isOnline: true,
        joinedAt: new Date(Date.now() - 1200000)
      },
      {
        id: '5',
        username: 'Emma_AI',
        portfolioValue: 98750,
        cash: 22000,
        rank: 5,
        pnl: -1250,
        pnlPercent: -1.25,
        isOnline: true,
        joinedAt: new Date(Date.now() - 900000)
      }
    ];

    this.leaderboard$.next(mockPlayers);

    // Messages de chat simulés
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        roomId: roomId,
        userId: '1',
        username: 'Mike_Pro',
        message: 'Bienvenue dans la salle ! 👋',
        timestamp: new Date(Date.now() - 300000),
        type: 'USER'
      },
      {
        id: '2',
        roomId: roomId,
        userId: 'system',
        username: 'SYSTÈME',
        message: '📢 La session commence dans 2 minutes',
        timestamp: new Date(Date.now() - 120000),
        type: 'SYSTEM'
      },
      {
        id: '3',
        roomId: roomId,
        userId: '2',
        username: 'Sarah_Trader',
        message: 'AAPL looks bullish 📈',
        timestamp: new Date(Date.now() - 60000),
        type: 'USER'
      }
    ];

    this.chatMessages$.next(mockMessages);

    // Démarrer le timer (30 minutes)
    this.startTimer(30);

    // Simuler des événements périodiques
    this.simulateRandomEvents(roomId);
  }

  private simulateRandomEvents(roomId: string): void {
    // Déclencher un événement toutes les 30 secondes (pour la démo)
    setTimeout(() => {
      const events: GameEvent[] = [
        {
          id: '1',
          roomId: roomId,
          type: 'NEWS',
          title: '📰 Apple annonce des résultats record',
          description: 'Les actions AAPL pourraient augmenter',
          impact: 5,
          timestamp: new Date()
        },
        {
          id: '2',
          roomId: roomId,
          type: 'MARKET_CRASH',
          title: '📉 Correction du marché',
          description: 'Vente massive sur tous les indices',
          impact: -10,
          timestamp: new Date()
        },
        {
          id: '3',
          roomId: roomId,
          type: 'FED_ANNOUNCEMENT',
          title: '🏦 La Fed maintient les taux',
          description: 'Les marchés réagissent positivement',
          impact: 3,
          timestamp: new Date()
        }
      ];

      const randomEvent = events[Math.floor(Math.random() * events.length)];
      this.triggerEvent(randomEvent);

      // Continuer à déclencher des événements
      if (this.timeRemaining$.value > 0) {
        this.simulateRandomEvents(roomId);
      }
    }, 30000); // Toutes les 30 secondes
  }

  /**
   * Observer la salle actuelle
   */
  getCurrentRoom(): Observable<GameRoom | null> {
    return this.currentRoom$.asObservable();
  }
}