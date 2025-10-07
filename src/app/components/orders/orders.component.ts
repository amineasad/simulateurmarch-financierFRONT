// src/app/components/orders/orders.component.ts

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TradingService } from '../../services/trading.service';
import { AuthService } from '../../services/auth.service';
import { WalletService } from '../../services/wallet.service';

interface Order {
  userId: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT' | 'STOP';
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
}

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {
  
  orderForm: Order = {
    userId: '',
    symbol: 'AAPL',
    type: 'LIMIT',
    side: 'BUY',
    price: 0,
    quantity: 100
  };

  selectedAsset: any = null;
  cashAvailable: number = 0;
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private router: Router,
    private tradingService: TradingService,
    private authService: AuthService,
    private walletService: WalletService
  ) {}

  ngOnInit(): void {
    // Récupérer l'utilisateur
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.orderForm.userId = user.id.toString();

    // Charger le symbole sélectionné
    this.tradingService.getSelectedAsset().subscribe(symbol => {
      this.orderForm.symbol = symbol;
      this.loadAssetInfo();
    });

    // Charger le cash disponible
    this.loadCash();
  }

  loadAssetInfo(): void {
    this.tradingService.getAssets().subscribe(assets => {
      this.selectedAsset = assets.find(a => a.symbol === this.orderForm.symbol);
      if (this.selectedAsset) {
        this.orderForm.price = this.selectedAsset.price;
      }
    });
  }

  loadCash(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) return;

    this.walletService.getWallet(user.id).subscribe({
      next: (wallet) => {
        this.cashAvailable = wallet.balance;
      },
      error: (error) => {
        console.error('Erreur chargement wallet:', error);
        this.cashAvailable = 0;
      }
    });
  }

  changeOrderType(type: 'MARKET' | 'LIMIT' | 'STOP'): void {
    this.orderForm.type = type;
    
    // Si MARKET, mettre le prix au prix actuel
    if (type === 'MARKET' && this.selectedAsset) {
      this.orderForm.price = this.selectedAsset.price;
    }
  }

  changeOrderSide(side: 'BUY' | 'SELL'): void {
    this.orderForm.side = side;
  }

  getOrderTotal(): number {
    return this.orderForm.price * this.orderForm.quantity;
  }

  placeOrder(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Validation
    if (this.orderForm.quantity <= 0) {
      this.errorMessage = 'La quantité doit être supérieure à 0';
      return;
    }

    if (this.orderForm.side === 'BUY') {
      const total = this.getOrderTotal();
      if (total > this.cashAvailable) {
        this.errorMessage = `Fonds insuffisants. Disponible: ${this.cashAvailable.toFixed(2)}€`;
        return;
      }
    }

    this.isLoading = true;

    // TODO: Remplacer par appel API vers le backend du Membre 1
    // Pour l'instant : SIMULATION avec logique correcte
    
    const simulatedResponse = this.simulateBackendResponse();
    
    setTimeout(() => {
      this.isLoading = false;
      
      // ✅ Afficher le bon message selon le statut
      if (simulatedResponse.status === 'FILLED') {
        this.successMessage = `✅ Ordre ${this.orderForm.side} de ${this.orderForm.quantity} ${this.orderForm.symbol} EXÉCUTÉ à ${simulatedResponse.executedPrice.toFixed(2)}€`;
        
        // Recharger le cash car l'argent a été déduit
        this.loadCash();
        
        // Redirection après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/trading']);
        }, 2000);
        
      } else if (simulatedResponse.status === 'PENDING') {
        this.successMessage = `⏳ Ordre ${this.orderForm.side} de ${this.orderForm.quantity} ${this.orderForm.symbol} PLACÉ dans le carnet d'ordres à ${this.orderForm.price.toFixed(2)}€. En attente d'exécution...`;
        
        // Redirection vers portfolio pour voir l'ordre en attente
        setTimeout(() => {
          this.router.navigate(['/portfolio']);
        }, 3000);
        
      } else if (simulatedResponse.status === 'PARTIALLY_FILLED') {
        this.successMessage = `⚠️ Ordre PARTIELLEMENT exécuté: ${simulatedResponse.filledQuantity}/${this.orderForm.quantity} à ${simulatedResponse.executedPrice.toFixed(2)}€`;
        
        // Recharger le cash
        this.loadCash();
        
        setTimeout(() => {
          this.router.navigate(['/portfolio']);
        }, 3000);
      }
    }, 1000);
  }

  /**
   * Simuler la réponse du backend (à remplacer par vrai appel API)
   */
  private simulateBackendResponse(): any {
    const currentPrice = this.selectedAsset?.price || this.orderForm.price;
    
    // Logique MARKET : toujours exécuté immédiatement
    if (this.orderForm.type === 'MARKET') {
      return {
        status: 'FILLED',
        executedPrice: currentPrice,
        filledQuantity: this.orderForm.quantity
      };
    }
    
    // Logique LIMIT
    if (this.orderForm.type === 'LIMIT') {
      if (this.orderForm.side === 'BUY') {
        // ACHAT : Si prix limite >= prix actuel → Exécution immédiate
        if (this.orderForm.price >= currentPrice) {
          return {
            status: 'FILLED',
            executedPrice: currentPrice, // Exécuté au meilleur prix (pas au prix limite)
            filledQuantity: this.orderForm.quantity
          };
        } else {
          // Prix limite < prix actuel → En attente dans le carnet
          return {
            status: 'PENDING',
            orderId: Math.floor(Math.random() * 10000)
          };
        }
      } else {
        // VENTE : Si prix limite <= prix actuel → Exécution immédiate
        if (this.orderForm.price <= currentPrice) {
          return {
            status: 'FILLED',
            executedPrice: currentPrice,
            filledQuantity: this.orderForm.quantity
          };
        } else {
          // Prix limite > prix actuel → En attente dans le carnet
          return {
            status: 'PENDING',
            orderId: Math.floor(Math.random() * 10000)
          };
        }
      }
    }
    
    // Par défaut (STOP, etc.)
    return {
      status: 'PENDING',
      orderId: Math.floor(Math.random() * 10000)
    };
  }

  goBack(): void {
    this.router.navigate(['/trading']);
  }
}