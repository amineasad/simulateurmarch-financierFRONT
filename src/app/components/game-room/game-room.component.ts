// src/app/components/game-room/game-room.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GameService } from '../../services/game.service';
import { TradingService } from '../../services/trading.service';
import { WebsocketService } from '../../services/websocket.service';
import { GameRoom, Player, GameEvent, ChatMessage } from '../../models/game.model';

@Component({
  selector: 'app-game-room',
  templateUrl: './game-room.component.html',
  styleUrls: ['./game-room.component.css']
})
export class GameRoomComponent implements OnInit, OnDestroy {
  roomId: string = '';
  currentRoom: GameRoom | null = null;
  
  // Classement
  leaderboard: Player[] = [];
  currentUserRank = 0;
  
  // Timer
  timeRemaining = 0;
  timeFormatted = '00:00';
  timerWarning = false;
  
  // Événements
  currentEvent: GameEvent | null = null;
  eventHistory: GameEvent[] = [];
  
  // Chat
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  username = 'TraderPro_' + Math.floor(Math.random() * 1000);
  
  // UI State
  showLeaderboard = true;
  showChat = true;
  showEventPanel = true;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameService: GameService,
    private tradingService: TradingService,
    private wsService: WebsocketService
  ) {}

  ngOnInit(): void {
    // Récupérer l'ID de la salle depuis l'URL
    this.roomId = this.route.snapshot.paramMap.get('id') || '';
    
    if (!this.roomId) {
      this.router.navigate(['/lobby']);
      return;
    }

    // Charger les données de la salle
    this.loadRoomData();
    
    // S'abonner aux observables
    this.subscribeToUpdates();
  }

  private loadRoomData(): void {
    // Simuler le chargement (en mode MOCK)
    // Plus tard, ce sera un appel au backend
    console.log('Chargement de la salle:', this.roomId);
  }

  private subscribeToUpdates(): void {
    // Observer le classement
    const leaderboardSub = this.gameService.getLeaderboard().subscribe(players => {
      this.leaderboard = players;
      this.updateCurrentUserRank();
    });
    this.subscriptions.push(leaderboardSub);

    // Observer le timer
    const timerSub = this.gameService.getTimeRemaining().subscribe(seconds => {
      this.timeRemaining = seconds;
      this.updateTimeFormatted();
      this.timerWarning = seconds <= 300 && seconds > 0; // Warning à 5 minutes
    });
    this.subscriptions.push(timerSub);

    // Observer les événements
    const eventsSub = this.gameService.getGameEvents().subscribe(event => {
      this.currentEvent = event;
      this.eventHistory.unshift(event);
      
      // Masquer l'événement après 10 secondes
      setTimeout(() => {
        if (this.currentEvent?.id === event.id) {
          this.currentEvent = null;
        }
      }, 10000);
    });
    this.subscriptions.push(eventsSub);

    // Observer le chat
    const chatSub = this.gameService.getChatMessages().subscribe(messages => {
      this.chatMessages = messages;
      this.scrollChatToBottom();
    });
    this.subscriptions.push(chatSub);
  }

  private updateCurrentUserRank(): void {
    const userPlayer = this.leaderboard.find(p => p.username === 'VOUS');
    this.currentUserRank = userPlayer ? userPlayer.rank : 0;
  }

  private updateTimeFormatted(): void {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    this.timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  // Actions
  sendChatMessage(): void {
    if (this.chatInput.trim()) {
      this.gameService.sendChatMessage(this.roomId, this.chatInput, this.username);
      this.chatInput = '';
    }
  }

  leaveRoom(): void {
    if (confirm('Êtes-vous sûr de vouloir quitter la salle ?')) {
      this.gameService.leaveRoom(this.roomId).subscribe({
        next: () => {
          this.router.navigate(['/lobby']);
        },
        error: (error) => {
          console.error('Erreur en quittant:', error);
          this.router.navigate(['/lobby']);
        }
      });
    }
  }

  toggleLeaderboard(): void {
    this.showLeaderboard = !this.showLeaderboard;
  }

  toggleChat(): void {
    this.showChat = !this.showChat;
  }

  toggleEventPanel(): void {
    this.showEventPanel = !this.showEventPanel;
  }

  getRankMedal(rank: number): string {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}.`;
    }
  }

  getEventIcon(type: string): string {
    switch(type) {
      case 'MARKET_CRASH': return '📉';
      case 'NEWS': return '📰';
      case 'VOLATILITY': return '⚡';
      case 'FED_ANNOUNCEMENT': return '🏦';
      case 'BANKRUPTCY': return '💥';
      default: return '📢';
    }
  }

  getEventColor(impact: number): string {
    if (impact > 0) return '#22c55e';
    if (impact < 0) return '#ef4444';
    return '#64748b';
  }

  getTimerColor(): string {
    if (this.timeRemaining <= 300) return '#ef4444'; // Rouge < 5 min
    if (this.timeRemaining <= 600) return '#eab308'; // Jaune < 10 min
    return '#22c55e'; // Vert
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}