import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WalletService } from '../../../services/wallet.service';

@Component({
  selector: 'app-success',
  template: `
    <div class="success-container">
      <div class="success-card">
        <div class="success-icon">✓</div>
        <h1>Paiement réussi !</h1>
        <p *ngIf="!isProcessing">Votre dépôt de {{ amount }}€ a été effectué avec succès.</p>
        <p *ngIf="isProcessing">Traitement de votre paiement en cours...</p>
        <button class="btn-primary" (click)="goToWallet()" [disabled]="isProcessing">
          Retour au portefeuille
        </button>
      </div>
    </div>
  `,
  styles: [`
    .success-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    }
    .success-card {
      background: rgba(15, 23, 42, 0.8);
      padding: 3rem;
      border-radius: 1rem;
      text-align: center;
      max-width: 500px;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .success-icon {
      font-size: 4rem;
      color: #22c55e;
      margin-bottom: 1rem;
    }
    h1 { color: #f1f5f9; margin-bottom: 1rem; }
    p { color: #94a3b8; margin-bottom: 2rem; }
    .btn-primary {
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class SuccessComponent implements OnInit {
  amount: number = 0;
  isProcessing = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private walletService: WalletService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const sessionId = params['session_id'];
      const userId = Number(params['userId']);
      this.amount = Number(params['amount']);

      // Enregistrer le dépôt dans la base de données
      this.walletService.deposit(userId, this.amount, sessionId).subscribe({
        next: () => {
          this.isProcessing = false;
        },
        error: (error) => {
          console.error('Erreur enregistrement dépôt:', error);
          this.isProcessing = false;
        }
      });
    });
  }

  goToWallet(): void {
    this.router.navigate(['/wallet/manage']);
  }
}