// src/app/components/portfolio/portfolio.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TradingService } from '../../services/trading.service';
import { WalletService } from '../../services/wallet.service';
import { AuthService } from '../../services/auth.service';

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
}

interface PendingOrder {
  orderId: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'STOP';
  quantity: number;
  price: number;
  createdAt: string;
  status: 'PENDING';
}

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css']
})
export class PortfolioComponent implements OnInit {
  
  portfolio: Position[] = [];
  pendingOrders: PendingOrder[] = []; // ← NOUVEAU
  cashAvailable: number = 0;
  totalPortfolioValue: number = 0;
  totalPnL: number = 0;
  
  isLoading = true;
  successMessage = '';
  errorMessage = '';

  constructor(
    private router: Router,
    private tradingService: TradingService,
    private walletService: WalletService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPortfolio();
    this.loadWallet();
    this.loadPendingOrders(); // ← NOUVEAU
  }

  loadPortfolio(): void {
    this.tradingService.getPortfolio().subscribe({
      next: (portfolio) => {
        this.portfolio = portfolio;
        this.calculatePortfolioStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur chargement portfolio:', error);
        this.isLoading = false;
      }
    });
  }

  loadWallet(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) return;

    this.walletService.getWallet(user.id).subscribe({
      next: (wallet) => {
        this.cashAvailable = wallet.balance;
      },
      error: (error) => {
        console.error('Erreur chargement wallet:', error);
      }
    });
  }

  /**
   * Charger les ordres en attente (PENDING)
   * ← NOUVELLE MÉTHODE
   */
  loadPendingOrders(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) return;

    // TODO: Remplacer par appel API vers backend Membre 1
    // GET /api/orders/pending/{userId}
    
    // Pour l'instant : simulation avec des données d'exemple
    // Commentez cette partie quand vous aurez l'API réelle
    /*setTimeout(() => {
      this.pendingOrders = [
        {
          orderId: 4567,
          symbol: 'AAPL',
          side: 'BUY',
          type: 'LIMIT',
          quantity: 10,
          price: 178.00,
          createdAt: new Date().toLocaleString('fr-FR'),
          status: 'PENDING'
        },
        {
          orderId: 4568,
          symbol: 'MSFT',
          side: 'BUY',
          type: 'LIMIT',
          quantity: 5,
          price: 425.50,
          createdAt: new Date().toLocaleString('fr-FR'),
          status: 'PENDING'
        }
      ];
    }, 500);
    */

    // Quand vous aurez l'API réelle du Membre 1, remplacez par :
    /*
    this.tradingService.getPendingOrders(user.id).subscribe({
      next: (orders) => {
        this.pendingOrders = orders;
      },
      error: (error) => {
        console.error('Erreur chargement ordres en attente:', error);
      }
    });
    */
  }

  /**
   * Annuler un ordre en attente
   * ← NOUVELLE MÉTHODE
   */
  cancelOrder(orderId: number): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Confirmation
    if (!confirm('Êtes-vous sûr de vouloir annuler cet ordre ?')) {
      return;
    }

    // TODO: Remplacer par appel API vers backend Membre 1
    // DELETE /api/orders/{orderId}
    
    // Pour l'instant : simulation
    setTimeout(() => {
      // Retirer l'ordre de la liste
      this.pendingOrders = this.pendingOrders.filter(o => o.orderId !== orderId);
      
      this.successMessage = 'Ordre annulé avec succès';
      
      // Recharger le wallet (les fonds réservés redeviennent disponibles)
      this.loadWallet();
      
      // Effacer le message après 3 secondes
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }, 500);

    // Quand vous aurez l'API réelle du Membre 1, remplacez par :
    /*
    this.tradingService.cancelOrder(orderId).subscribe({
      next: () => {
        this.successMessage = 'Ordre annulé avec succès';
        
        // Retirer l'ordre de la liste
        this.pendingOrders = this.pendingOrders.filter(o => o.orderId !== orderId);
        
        // Recharger le wallet
        this.loadWallet();
        
        // Effacer le message après 3 secondes
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Erreur annulation ordre:', error);
        this.errorMessage = 'Erreur lors de l\'annulation de l\'ordre';
        
        setTimeout(() => {
          this.errorMessage = '';
        }, 3000);
      }
    });
    */
  }

  calculatePortfolioStats(): void {
    this.totalPortfolioValue = this.portfolio.reduce(
      (sum, position) => sum + (position.quantity * position.currentPrice),
      0
    );
    
    this.totalPnL = this.portfolio.reduce(
      (sum, position) => sum + this.getPositionPnL(position),
      0
    );
  }

  getPositionPnL(position: Position): number {
    return position.quantity * (position.currentPrice - position.avgPrice);
  }

  getPositionPnLPercent(position: Position): number {
    return ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100;
  }

  getTotalValue(): number {
    return this.totalPortfolioValue + this.cashAvailable;
  }

  goBack(): void {
    this.router.navigate(['/trading']);
  }

  goToWallet(): void {
    this.router.navigate(['/wallet/manage']);
  }

  goToOrders(): void {
    this.router.navigate(['/orders']);
  }
}