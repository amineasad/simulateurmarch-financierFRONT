// src/app/components/lobby/lobby.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TradingSessionService } from '../../services/trading-session.service';
import { AuthService } from '../../services/auth.service';
import { TradingSession, SessionStatus } from '../../models/trading-session.model';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css']
})
export class LobbyComponent implements OnInit {
  sessions: TradingSession[] = [];
  filteredSessions: TradingSession[] = [];
  isLoading = false;
  
  // Filtre
  filterStatus: 'all' | 'waiting' | 'open' = 'all';
  searchCode = '';
  
  // Utilisateur actuel
  currentUser: any;
  
  // Formulaire de création (modal)
  showCreateModal = false;
  newSession: TradingSession = {
    nom: '',
    description: '',
    status: SessionStatus.WAITING,
    heureDebut: '',
    heureFin: '',
    dureeMinutes: 30,
    maxParticipants: 10,
    modeAccelere: false,
    cashInitial: 100000,
    createurId: 0
  };

  constructor(
    private sessionService: TradingSessionService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient 
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.loadSessions();
  }

  /**
   * Charger toutes les sessions actives
   */
  loadSessions(): void {
    this.isLoading = true;
    
    this.sessionService.getActiveSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.filterSessions();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur chargement sessions:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Filtrer les sessions
   */
  filterSessions(): void {
    this.filteredSessions = this.sessions.filter(session => {
      // Filtre par statut
      if (this.filterStatus !== 'all') {
        const status = this.filterStatus.toUpperCase();
        if (session.status !== status) {
          return false;
        }
      }
      
      // Filtre par code
      if (this.searchCode) {
        return session.codeAcces?.toLowerCase().includes(this.searchCode.toLowerCase());
      }
      
      return true;
    });
  }

  /**
   * Rejoindre une session
   */
  joinSession(session: TradingSession): void {
    if (!session.id) return;
    
    this.sessionService.joinSession(session.id, this.currentUser.id).subscribe({
      next: () => {
        console.log('✅ Session rejointe');
        this.router.navigate(['/gamingroom', session.id]);
      },
      error: (error) => {
        console.error('❌ Erreur:', error);
        alert(error.error?.message || 'Impossible de rejoindre la session');
      }
    });
  }

   /**
 * Rejoindre une session en mode Replay (salle de jeu)
 */
joinSessionReplay(session: TradingSession): void {
  if (!session.id) return;

  // 1) On s'assure que l'utilisateur rejoint bien la session
  this.sessionService.joinSession(session.id, this.currentUser.id).subscribe({
    next: () => {
      console.log('✅ Session rejointe (Replay)');

      // 2) On démarre le moteur de replay côté backend
      const body = {
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'PYPL', 'INTC', 'AMD','EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP','XAU/USD', 'XAG/USD', 'XPT/USD', 'XPD/USD','SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VWO', 'EEM', 'GLD', 'SLV', 'TLT'],
        mode: 'full'  // ou 'full' si tu veux la vraie année complète
      };

      this.http
        .post(`http://localhost:9090/examen/api/replay/${session.id}/start-auto`, body)
        .subscribe({
          next: (response: any) => {
            console.log('✅ Replay initialisé :', response);

            // 3) On redirige vers la gaming room en mode replay
            this.router.navigate(
              ['/gamingroom', session.id],      // 👈 même route que ton mode live
              { queryParams: { mode: 'replay' } }
            );
          },
          error: (err) => {
            console.error('❌ Erreur initialisation replay :', err);
            alert('Impossible de démarrer le mode replay');
          }
        });
    },
    error: (error) => {
      console.error('❌ Erreur :', error);
      alert(error.error?.message || 'Impossible de rejoindre la session en replay');
    }
  });
}



  /**
   * Rejoindre par code
   */
  joinByCode(): void {
    if (!this.searchCode) {
      alert('Entrez un code d\'accès');
      return;
    }
    
    this.sessionService.joinSessionByCode(this.searchCode, this.currentUser.id).subscribe({
      next: (participation) => {
        console.log('✅ Session rejointe par code');
        // Récupérer l'ID de la session depuis la participation
        this.router.navigate(['/gaming-room', participation.sessionId]);
      },
      error: (error) => {
        console.error('❌ Erreur:', error);
        alert('Code invalide ou session non trouvée');
      }
    });
  }

  /**
   * Ouvrir le modal de création
   */
  openCreateModal(): void {
    this.showCreateModal = true;
    this.newSession.createurId = this.currentUser.id;
    this.newSession.heureDebut = new Date().toISOString();
  }

  /**
   * Fermer le modal
   */
  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  /**
   * Créer une nouvelle session
   */
  createSession(): void {
    // Calculer heureFin
    const debut = new Date(this.newSession.heureDebut);
    debut.setMinutes(debut.getMinutes() + this.newSession.dureeMinutes);
    this.newSession.heureFin = debut.toISOString();
    
    this.sessionService.createSession(this.newSession).subscribe({
      next: (created) => {
        console.log('✅ Session créée:', created);
        this.closeCreateModal();
        this.loadSessions();
        alert(`Session créée avec le code: ${created.codeAcces}`);
      },
      error: (error) => {
        console.error('❌ Erreur création:', error);
        alert('Erreur lors de la création');
      }
    });
  }

  /**
   * Obtenir le badge de statut
   */
  getStatusBadge(status: SessionStatus): string {
    switch (status) {
      case SessionStatus.WAITING:
        return 'En attente';
      case SessionStatus.OPEN:
        return 'En cours';
      case SessionStatus.PAUSED:
        return 'En pause';
      case SessionStatus.CLOSED:
        return 'Terminée';
      default:
        return status;
    }
  }

  /**
   * Obtenir la couleur du badge
   */
  getStatusColor(status: SessionStatus): string {
    switch (status) {
      case SessionStatus.WAITING:
        return 'bg-blue-500';
      case SessionStatus.OPEN:
        return 'bg-green-500';
      case SessionStatus.PAUSED:
        return 'bg-yellow-500';
      case SessionStatus.CLOSED:
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  }

  /**
   * Formater la date
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}