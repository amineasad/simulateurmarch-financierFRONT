// ====================================================================
// src/app/components/orders/orders.component.ts - VERSION UNIFIÉE
// ====================================================================

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TradingService } from '../../services/trading.service';
import { AuthService } from '../../services/auth.service';
import { WalletService } from '../../services/wallet.service';
import { LocalOrderBookService } from '../../services/local-orderbook.service';

interface Order {
  userId: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT';  // ✅ Supprimé STOP
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
    private walletService: WalletService,
    private localOrderBookService: LocalOrderBookService  // ✅ AJOUTÉ
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) {
      this.router.navigate(['/login']);
      return;
    }
    this.orderForm.userId = user.id.toString();

    this.tradingService.getSelectedAsset().subscribe(symbol => {
      this.orderForm.symbol = symbol;
      this.loadAssetInfo();
    });

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

  changeOrderType(type: 'MARKET' | 'LIMIT'): void {  // ✅ Enlevé STOP
    this.orderForm.type = type;
    
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

  /**
   * ✅ NOUVELLE VERSION : Utilise LocalOrderBookService (comme gaming room)
   */
  placeOrder(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Validations
    if (this.orderForm.quantity <= 0) {
      this.errorMessage = 'La quantité doit être supérieure à 0';
      return;
    }

    const symbol = this.orderForm.symbol;
    const side = this.orderForm.side;
    const quantity = this.orderForm.quantity;
    const type = this.orderForm.type;

    // Validation BUY
    if (side === 'BUY') {
      const total = this.getOrderTotal();
      if (total > this.cashAvailable) {
        this.errorMessage = `Fonds insuffisants. Disponible: ${this.cashAvailable.toFixed(2)}€`;
        return;
      }
    }

    // Validation SELL
    if (side === 'SELL') {
      const position = this.tradingService.getPosition(symbol);
      if (!position || position.quantity < quantity) {
        this.errorMessage = 'Position insuffisante pour vendre';
        return;
      }
    }

    this.isLoading = true;

    // ✅ LOGIQUE IDENTIQUE À GAMING ROOM
    setTimeout(() => {
      let executionPrice: number;

      if (type === 'MARKET') {
        // ✅ MARKET : Exécuter immédiatement contre le carnet
        executionPrice = this.localOrderBookService.executeMarketOrder(symbol, side, quantity);
        
        if (executionPrice === 0) {
          this.errorMessage = 'Pas de liquidité disponible dans le carnet';
          this.isLoading = false;
          return;
        }

        // Mettre à jour le portfolio
        if (side === 'BUY') {
          this.tradingService.addPosition(symbol, quantity, executionPrice);
          this.cashAvailable -= executionPrice * quantity;
        } else {
          this.tradingService.removePosition(symbol, quantity);
          this.cashAvailable += executionPrice * quantity;
        }

        this.successMessage = `✅ Ordre MARKET ${side === 'BUY' ? 'Achat' : 'Vente'}: ${quantity} ${symbol} exécuté à ${executionPrice.toFixed(2)}€`;
        
        this.isLoading = false;
        
        // Redirection après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/trading']);
        }, 2000);

      } else {
        // ✅ LIMIT : Ajouter au carnet
        const limitPrice = this.orderForm.price;
        
        this.localOrderBookService.addLimitOrder(symbol, side, limitPrice, quantity);
        
        this.successMessage = `⏳ Ordre LIMIT ${side === 'BUY' ? 'Achat' : 'Vente'}: ${quantity} ${symbol} placé à ${limitPrice.toFixed(2)}€ (en attente)`;
        
        this.isLoading = false;

        // ✅ Simuler l'exécution après 3-5 secondes
        const executionDelay = 3000 + Math.random() * 2000;
        
        setTimeout(() => {
          if (side === 'BUY') {
            this.tradingService.addPosition(symbol, quantity, limitPrice);
            this.cashAvailable -= limitPrice * quantity;
          } else {
            this.tradingService.removePosition(symbol, quantity);
            this.cashAvailable += limitPrice * quantity;
          }
          
          this.successMessage = `✅ Ordre LIMIT exécuté: ${quantity} ${symbol} @ ${limitPrice.toFixed(2)}€`;
          
          // Redirection
          setTimeout(() => {
            this.router.navigate(['/portfolio']);
          }, 2000);
        }, executionDelay);
      }
    }, 500);
  }

  goBack(): void {
    this.router.navigate(['/trading']);
  }
}

// ====================================================================
// MODIFICATIONS DANS orders.component.html
// ====================================================================

/*
Dans le HTML, SUPPRIMEZ le bouton STOP :

AVANT (à supprimer) :
<button 
  class="btn-type"
  [class.active]="orderForm.type === 'STOP'"
  (click)="changeOrderType('STOP')">
  Stop
</button>

APRÈS :
Gardez seulement :
- Marché
- Limite
*/

// ====================================================================
// RÉSUMÉ
// ====================================================================

/*
✅ CE QUI A CHANGÉ :

1. Import de LocalOrderBookService
2. Injection du service dans constructor
3. Type 'STOP' supprimé (seulement MARKET et LIMIT)
4. placeOrder() utilise maintenant :
   - executeMarketOrder() pour MARKET
   - addLimitOrder() pour LIMIT
5. Même logique exacte que gaming-room
6. Portfolio mis à jour localement (addPosition / removePosition)

✅ RÉSULTAT :

- Ordre MARKET → Consomme le carnet immédiatement
- Ordre LIMIT → S'ajoute au carnet, exécution après 3-5s
- Cash mis à jour automatiquement
- Redirection vers trading ou portfolio

✅ COHÉRENCE TOTALE :

- Page trading principale : LocalOrderBook
- Gaming room : SessionOrderBook (backend)
- Page orders : LocalOrderBook (même que trading)
- Logique identique partout !
*/