// src/app/components/game-lobby/game-lobby.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { GameService } from '../../services/game.service';
import { GameRoom } from '../../models/game.model';

@Component({
  selector: 'app-game-lobby',
  templateUrl: './game-lobby.component.html',
  styleUrls: ['./game-lobby.component.css']
})
export class GameLobbyComponent implements OnInit, OnDestroy {
  rooms: GameRoom[] = [];
  loading = false;
  showCreateModal = false;
  username = 'TraderPro_' + Math.floor(Math.random() * 1000);

  // Formulaire de création
  newRoom = {
    name: '',
    scenario: 'NORMAL' as 'NORMAL' | 'CRASH_2008' | 'COVID_2020' | 'VOLATILE',
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD',
    maxPlayers: 20,
    duration: 30,
    initialBudget: 100000
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private gameService: GameService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRooms();
    
    // Rafraîchir toutes les 10 secondes
    const refreshInterval = interval(10000).subscribe(() => {
      this.loadRooms();
    });
    this.subscriptions.push(refreshInterval);
  }

  loadRooms(): void {
    this.gameService.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
      },
      error: (error) => {
        console.error('Erreur chargement salles:', error);
      }
    });
  }

  joinRoom(room: GameRoom): void {
    if (room.currentPlayers >= room.maxPlayers) {
      alert('❌ Salle pleine !');
      return;
    }

    if (room.status === 'FINISHED') {
      alert('❌ Cette session est terminée');
      return;
    }

    this.loading = true;
    this.gameService.joinRoom(room.id, this.username).subscribe({
      next: () => {
        // Rediriger vers la salle de trading
        this.router.navigate(['/game-room', room.id]);
      },
      error: (error) => {
        console.error('Erreur rejoindre salle:', error);
        alert('❌ Impossible de rejoindre la salle');
        this.loading = false;
      }
    });
  }

  observeRoom(room: GameRoom): void {
    // Mode observateur (sans participer)
    alert('🔭 Mode observateur - Fonctionnalité à venir');
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetForm();
  }

  createRoom(): void {
    if (!this.newRoom.name.trim()) {
      alert('❌ Veuillez entrer un nom pour la salle');
      return;
    }

    this.loading = true;
    this.gameService.createRoom(this.newRoom).subscribe({
      next: (room) => {
        this.showCreateModal = false;
        this.resetForm();
        // Rejoindre automatiquement la salle créée
        this.router.navigate(['/game-room', room.id]);
      },
      error: (error) => {
        console.error('Erreur création salle:', error);
        alert('❌ Impossible de créer la salle');
        this.loading = false;
      }
    });
  }

  private resetForm(): void {
    this.newRoom = {
      name: '',
      scenario: 'NORMAL',
      difficulty: 'MEDIUM',
      maxPlayers: 20,
      duration: 30,
      initialBudget: 100000
    };
  }

  getDifficultyColor(difficulty: string): string {
    switch(difficulty) {
      case 'EASY': return '#22c55e';
      case 'MEDIUM': return '#eab308';
      case 'HARD': return '#ef4444';
      default: return '#64748b';
    }
  }

  getStatusIcon(status: string): string {
    switch(status) {
      case 'WAITING': return '🟢';
      case 'IN_PROGRESS': return '🔴';
      case 'FINISHED': return '⚫';
      default: return '⚪';
    }
  }

  getStatusText(status: string): string {
    switch(status) {
      case 'WAITING': return 'En attente';
      case 'IN_PROGRESS': return 'En cours';
      case 'FINISHED': return 'Terminée';
      default: return 'Inconnue';
    }
  }

  getScenarioName(scenario: string): string {
    switch(scenario) {
      case 'NORMAL': return 'Marché Normal';
      case 'CRASH_2008': return 'Crise 2008';
      case 'COVID_2020': return 'COVID 2020';
      case 'VOLATILE': return 'Haute Volatilité';
      default: return scenario;
    }
  }

  getTimeSinceCreation(createdAt: Date): string {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const diffMinutes = Math.floor((now - created) / 60000);

    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `Il y a ${diffHours}h`;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  // Ajouter ces méthodes dans la classe GameLobbyComponent

getTotalPlayers(): number {
  return this.rooms.reduce((sum, room) => sum + room.currentPlayers, 0);
}

getActiveSessions(): number {
  return this.rooms.filter(room => room.status === 'IN_PROGRESS').length;
}
}