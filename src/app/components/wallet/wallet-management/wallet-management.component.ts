// src/app/components/wallet/wallet-management/wallet-management.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService, Wallet, WalletTransaction } from '../../../services/wallet.service';
import { AuthService } from '../../../services/auth.service';
import { TradingService } from '../../../services/trading.service';

@Component({
  selector: 'app-wallet-management',
  templateUrl: './wallet-management.component.html',
  styleUrls: ['./wallet-management.component.css']
})
export class WalletManagementComponent implements OnInit {
  
  wallet: Wallet | null = null;
  transactions: WalletTransaction[] = [];
  
  // Formulaires
  depositAmount: number = 0;
  withdrawAmount: number = 0;
  
  // États
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Onglets
  activeTab: 'deposit' | 'withdraw' | 'history' = 'deposit';

  // Cash affiché (source = TradingService)
  displayedCash: number = 0;

  constructor(
    private walletService: WalletService,
    private authService: AuthService,
    private router: Router,
    private tradingService: TradingService
  ) {}

  ngOnInit(): void {
    this.loadWallet();        // initialise cash si nécessaire
    this.loadTransactions();  // juste l’historique

    // 🔄 Abonnement global au cash du TradingService
    this.tradingService.getCash().subscribe(cash => {
      this.displayedCash = cash;
      if (this.wallet) {
        // On garde le même objet wallet mais on ajuste le solde
        this.wallet = { ...this.wallet, balance: cash };
      }
    });
  }

  /**
   * Charge le wallet depuis le backend UNIQUEMENT si le cash du TradingService
   * n'a pas encore été initialisé, sinon on garde le cash en mémoire.
   */
  loadWallet(forceBackend: boolean = false): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) {
      this.router.navigate(['/login']);
      return;
    }

    // 1) Premier chargement : on synchronise backend -> TradingService
    if (!this.tradingService.isCashInitialized() || forceBackend) {
      this.walletService.getWallet(user.id).subscribe({
        next: (wallet) => {
          this.wallet = wallet;
          // ✅ On utilise le solde backend comme point de départ
          this.tradingService.setCash(wallet.balance);
        },
        error: (error) => {
          console.error('Erreur chargement wallet:', error);
          this.errorMessage = 'Impossible de charger le portefeuille';
        }
      });
    } else {
      // 2) Cash déjà géré par TradingService : on ne touche plus au backend,
      //    on ne fait que refléter la valeur mémorisée
      const currentCash = this.displayedCash;
      if (this.wallet) {
        this.wallet = { ...this.wallet, balance: currentCash };
      } else {
        // petit wallet "virtuel" pour l’affichage
        this.wallet = {
          id: 0,
          balance: currentCash,
          createdAt: '',
          updatedAt: ''
        };
      }
    }
  }

  loadTransactions(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) return;

    this.walletService.getTransactions(user.id).subscribe({
      next: (transactions) => {
        this.transactions = transactions;
      },
      error: (error) => {
        console.error('Erreur chargement transactions:', error);
      }
    });
  }

  onDeposit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.depositAmount <= 0) {
      this.errorMessage = 'Le montant doit être supérieur à 0';
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user || !user.id) return;

    this.isLoading = true;

    // Créer une session Stripe Checkout
    this.walletService.createCheckoutSession(user.id, this.depositAmount).subscribe({
      next: (response) => {
        // Rediriger vers la page de paiement Stripe
        window.location.href = response.url;
      },
      error: (error) => {
        console.error('Erreur création session Stripe:', error);
        this.errorMessage = 'Erreur lors de la création de la session de paiement';
        this.isLoading = false;
      }
    });
  }

  onWithdraw(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.withdrawAmount <= 0) {
      this.errorMessage = 'Le montant doit être supérieur à 0';
      return;
    }

    // On vérifie par rapport au cash actuel (TradingService)
    const currentCash = this.displayedCash;
    if (this.withdrawAmount > currentCash) {
      this.errorMessage = 'Solde insuffisant';
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user || !user.id) return;

    this.isLoading = true;

    this.walletService.withdraw(user.id, this.withdrawAmount).subscribe({
      next: () => {
        // 🔁 On force un reload depuis le backend SI tu veux refléter le vrai solde serveur
        // (sinon tu peux juste décrémenter localement).
        // Ici je synchronise les deux :
        const newCash = currentCash - this.withdrawAmount;
        this.tradingService.setCash(newCash);

        if (this.wallet) {
          this.wallet = { ...this.wallet, balance: newCash };
        }

        this.successMessage = `Retrait de ${this.withdrawAmount}€ effectué avec succès !`;
        this.withdrawAmount = 0;
        this.loadTransactions();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur retrait:', error);
        this.errorMessage = error.error || 'Erreur lors du retrait';
        this.isLoading = false;
      }
    });
  }

  setTab(tab: 'deposit' | 'withdraw' | 'history'): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
  }

  goBack(): void {
    this.router.navigate(['/trading']);
  }

  getTransactionIcon(type: string): string {
    return type === 'DEPOSIT' ? '💰' : '💸';
  }

  getTransactionColor(type: string): string {
    return type === 'DEPOSIT' ? 'positive' : 'negative';
  }
}
