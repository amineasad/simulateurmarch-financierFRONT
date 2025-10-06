// src/app/components/wallet/wallet-management/wallet-management.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService, Wallet, WalletTransaction } from '../../../services/wallet.service';
import { AuthService } from '../../../services/auth.service';

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

  constructor(
    private walletService: WalletService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadWallet();
    this.loadTransactions();
  }

  loadWallet(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) {
      this.router.navigate(['/login']);
      return;
    }

    this.walletService.getWallet(user.id).subscribe({
      next: (wallet) => {
        this.wallet = wallet;
      },
      error: (error) => {
        console.error('Erreur chargement wallet:', error);
        this.errorMessage = 'Impossible de charger le portefeuille';
      }
    });
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

    if (this.wallet && this.withdrawAmount > this.wallet.balance) {
      this.errorMessage = 'Solde insuffisant';
      return;
    }

    const user = this.authService.getCurrentUser();
    if (!user || !user.id) return;

    this.isLoading = true;

    this.walletService.withdraw(user.id, this.withdrawAmount).subscribe({
      next: (transaction) => {
        this.successMessage = `Retrait de ${this.withdrawAmount}€ effectué avec succès !`;
        this.withdrawAmount = 0;
        this.loadWallet();
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