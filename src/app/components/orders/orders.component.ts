// ====================================================================
// src/app/components/orders/orders.component.ts - VERSION CORRIGÉE RÉALISTE
// ====================================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TradingService } from '../../services/trading.service';
import { AuthService } from '../../services/auth.service';
import { WalletService } from '../../services/wallet.service';
import { LocalOrderBookService, LocalOrderBook } from '../../services/local-orderbook.service';

interface Order {
  userId: string;
  symbol: string;
  type: 'MARKET' | 'LIMIT';
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
}

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit, OnDestroy {
  
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
  currentOrderBook: LocalOrderBook | null = null;
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  // ✅ NOUVEAU : Indicateurs pour le prix optimal
  pricePositionMessage = '';
  pricePositionClass = '';

  private subscriptions: Subscription[] = [];
  private pendingOrderId: string | null = null; // Pour tracker l'ordre en attente

  constructor(
    private router: Router,
    private tradingService: TradingService,
    private authService: AuthService,
    private walletService: WalletService,
    private localOrderBookService: LocalOrderBookService
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
      this.loadOrderBook(); // ✅ NOUVEAU : Charger le carnet
    });

    // ✅ Suivre le cash global
    const cashSub = this.tradingService.getCash().subscribe(c => (this.cashAvailable = c));
    this.subscriptions.push(cashSub);

    // ✅ NOUVEAU : Surveiller les changements de prix pour exécuter les ordres en attente
    const assetsSub = this.tradingService.getAssets().subscribe(assets => {
      if (this.pendingOrderId) {
        this.checkPendingOrderExecution();
      }
    });
    this.subscriptions.push(assetsSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadAssetInfo(): void {
    this.tradingService.getAssets().subscribe(assets => {
      this.selectedAsset = assets.find(a => a.symbol === this.orderForm.symbol);
      if (this.selectedAsset) {
        this.orderForm.price = this.selectedAsset.price;
        this.checkPricePosition(); // ✅ Vérifier la position dès le chargement
      }
    });
  }

  // ✅ NOUVEAU : Charger le carnet d'ordres
  loadOrderBook(): void {
    this.localOrderBookService.getOrderBook(this.orderForm.symbol).subscribe(book => {
      this.currentOrderBook = book;
      this.checkPricePosition();
    });
  }

  changeOrderType(type: 'MARKET' | 'LIMIT'): void {
    this.orderForm.type = type;
    
    if (type === 'MARKET' && this.selectedAsset) {
      this.orderForm.price = this.selectedAsset.price;
    }
    
    this.pricePositionMessage = ''; // Reset le message
  }

  changeOrderSide(side: 'BUY' | 'SELL'): void {
    this.orderForm.side = side;
    this.checkPricePosition(); // ✅ Recalculer la position
  }

  getOrderTotal(): number {
    return this.orderForm.price * this.orderForm.quantity;
  }

  // ✅ NOUVEAU : Définir automatiquement le prix optimal pour être premier
  setOptimalPrice(): void {
    if (!this.currentOrderBook) {
      this.errorMessage = 'Carnet non disponible';
      return;
    }

    const book = this.currentOrderBook;
    if (book.bids.length === 0 || book.asks.length === 0) {
      this.errorMessage = 'Carnet vide';
      return;
    }

    const bestBid = book.bids[0].price;
    const bestAsk = book.asks[0].price;
    const tickSize = this.orderForm.symbol.includes('/') ? 0.00001 : 0.01;

    let optimalPrice: number;

    if (this.orderForm.side === 'BUY') {
      // Prix optimal = meilleur BID + 1 tick (pour être premier)
      optimalPrice = bestBid + tickSize;
      
      if (optimalPrice >= bestAsk) {
        this.errorMessage = `Spread trop serré (${(bestAsk - bestBid).toFixed(5)}€). Impossible d'être premier sans exécution immédiate.`;
        return;
      }
    } else {
      // Prix optimal = meilleur ASK - 1 tick
      optimalPrice = bestAsk - tickSize;
      
      if (optimalPrice <= bestBid) {
        this.errorMessage = `Spread trop serré (${(bestAsk - bestBid).toFixed(5)}€). Impossible d'être premier sans exécution immédiate.`;
        return;
      }
    }

    this.orderForm.price = +optimalPrice.toFixed(this.orderForm.symbol.includes('/') ? 5 : 2);
    this.successMessage = `💡 Prix optimal défini : ${this.orderForm.price}€ (sera premier dans le carnet ${this.orderForm.side === 'BUY' ? 'BID' : 'ASK'})`;
    this.checkPricePosition();
  }

  // ✅ NOUVEAU : Vérifier en temps réel si le prix sera premier dans le carnet
  checkPricePosition(): void {
    if (!this.currentOrderBook || this.orderForm.type !== 'LIMIT') {
      this.pricePositionMessage = '';
      return;
    }

    const book = this.currentOrderBook;
    if (book.bids.length === 0 || book.asks.length === 0) return;

    const bestBid = book.bids[0].price;
    const bestAsk = book.asks[0].price;
    const price = this.orderForm.price;

    if (this.orderForm.side === 'BUY') {
      if (price >= bestAsk) {
        this.pricePositionMessage = `⚡ Sera exécuté IMMÉDIATEMENT (prix ≥ meilleur ASK ${bestAsk.toFixed(2)}€)`;
        this.pricePositionClass = 'immediate';
      } else if (price > bestBid) {
        this.pricePositionMessage = `🥇 Sera le NOUVEAU meilleur BID (entre ${bestBid.toFixed(2)}€ et ${bestAsk.toFixed(2)}€)`;
        this.pricePositionClass = 'first';
      } else if (price === bestBid) {
        this.pricePositionMessage = `⚠️ Même prix que le meilleur BID actuel (${bestBid.toFixed(2)}€)`;
        this.pricePositionClass = 'same';
      } else {
        this.pricePositionMessage = `📉 Sera derrière le meilleur BID (${bestBid.toFixed(2)}€)`;
        this.pricePositionClass = 'behind';
      }
    } else {
      if (price <= bestBid) {
        this.pricePositionMessage = `⚡ Sera exécuté IMMÉDIATEMENT (prix ≤ meilleur BID ${bestBid.toFixed(2)}€)`;
        this.pricePositionClass = 'immediate';
      } else if (price < bestAsk) {
        this.pricePositionMessage = `🥇 Sera le NOUVEAU meilleur ASK (entre ${bestBid.toFixed(2)}€ et ${bestAsk.toFixed(2)}€)`;
        this.pricePositionClass = 'first';
      } else if (price === bestAsk) {
        this.pricePositionMessage = `⚠️ Même prix que le meilleur ASK actuel (${bestAsk.toFixed(2)}€)`;
        this.pricePositionClass = 'same';
      } else {
        this.pricePositionMessage = `📈 Sera derrière le meilleur ASK (${bestAsk.toFixed(2)}€)`;
        this.pricePositionClass = 'behind';
      }
    }
  }

  // ✅ NOUVEAU : Appeler lors du changement de prix
  onPriceChange(): void {
    this.checkPricePosition();
  }

  /**
   * ✅ VERSION CORRIGÉE : Logique réaliste d'exécution des ordres
   */
  placeOrder(): void {
    this.errorMessage = '';
    this.successMessage = '';

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

    setTimeout(() => {
      let executionPrice: number;

      if (type === 'MARKET') {
        // ⚡ MARKET : Exécution immédiate
        executionPrice = this.localOrderBookService.executeMarketOrder(symbol, side, quantity);
        
        if (executionPrice === 0) {
          this.errorMessage = 'Pas de liquidité disponible dans le carnet';
          this.isLoading = false;
          return;
        }

        const total = executionPrice * quantity;

        if (side === 'BUY') {
          this.tradingService.addPosition(symbol, quantity, executionPrice);
          this.tradingService.debitCash(total);
        } else {
          this.tradingService.removePosition(symbol, quantity);
          this.tradingService.creditCash(total);
        }

        this.successMessage = `✅ Ordre MARKET ${side === 'BUY' ? 'Achat' : 'Vente'}: ${quantity} ${symbol} exécuté à ${executionPrice.toFixed(2)}€`;
        this.isLoading = false;
        
        setTimeout(() => {
          this.router.navigate(['/trading']);
        }, 2000);

      } else {
        // 📝 LIMIT : Vérifier si exécution immédiate possible
        const limitPrice = this.orderForm.price;
        
        const immediateExecutionPrice = this.localOrderBookService.canExecuteLimitOrder(
          symbol, 
          side, 
          limitPrice
        );

        if (immediateExecutionPrice !== null) {
          // ⚡ EXÉCUTION IMMÉDIATE
          executionPrice = this.localOrderBookService.executeMarketOrder(symbol, side, quantity);
          
          if (executionPrice === 0) {
            this.errorMessage = 'Pas de liquidité disponible';
            this.isLoading = false;
            return;
          }

          const total = executionPrice * quantity;

          if (side === 'BUY') {
            this.tradingService.addPosition(symbol, quantity, executionPrice);
            this.tradingService.debitCash(total);
          } else {
            this.tradingService.removePosition(symbol, quantity);
            this.tradingService.creditCash(total);
          }

          this.successMessage = `✅ Ordre LIMIT exécuté immédiatement: ${quantity} ${symbol} @ ${executionPrice.toFixed(2)}€ (limite: ${limitPrice.toFixed(2)}€)`;
          this.isLoading = false;
          
          setTimeout(() => {
            this.router.navigate(['/trading']);
          }, 2000);

        } else {
          // ⏳ AJOUT AU CARNET (pas d'exécution immédiate)
          this.localOrderBookService.addLimitOrder(symbol, side, limitPrice, quantity);
          
          // ✅ CHANGEMENT MAJEUR : Pas de Math.random() !
          // L'ordre reste dans le carnet et sera exécuté si le prix du marché l'atteint
          
          this.pendingOrderId = `${symbol}-${side}-${Date.now()}`; // Tracker l'ordre
          
          this.successMessage = `⏳ Ordre LIMIT ${side === 'BUY' ? 'Achat' : 'Vente'} ajouté au carnet:
          
${quantity} ${symbol} @ ${limitPrice.toFixed(2)}€

📖 Votre ordre est maintenant visible dans le carnet d'ordres.

✅ Il sera exécuté automatiquement si:
${side === 'BUY' 
  ? `• Un vendeur accepte votre prix (≤ ${limitPrice.toFixed(2)}€)`
  : `• Un acheteur accepte votre prix (≥ ${limitPrice.toFixed(2)}€)`
}

💡 Retournez à la page Trading pour surveiller l'évolution du marché.`;
          
          this.isLoading = false;

          setTimeout(() => {
            this.router.navigate(['/trading']);
          }, 4000);
        }
      }
    }, 500);
  }

  /**
   * ✅ NOUVEAU : Vérifier si un ordre en attente peut s'exécuter
   * Cette méthode est appelée à chaque mise à jour de prix
   */
  private checkPendingOrderExecution(): void {
    if (!this.pendingOrderId) return;

    // Récupérer le carnet actuel
    this.localOrderBookService.getOrderBook(this.orderForm.symbol).subscribe(book => {
      if (!book) return;

      const limitPrice = this.orderForm.price;
      const side = this.orderForm.side;

      let shouldExecute = false;

      if (side === 'BUY') {
        // Exécuter si le meilleur ASK descend à notre prix ou moins
        if (book.asks.length > 0 && book.asks[0].price <= limitPrice) {
          shouldExecute = true;
        }
      } else {
        // Exécuter si le meilleur BID monte à notre prix ou plus
        if (book.bids.length > 0 && book.bids[0].price >= limitPrice) {
          shouldExecute = true;
        }
      }

      if (shouldExecute) {
        // ✅ CONDITIONS ATTEINTES : Exécuter l'ordre
        const executionPrice = this.localOrderBookService.executeMarketOrder(
          this.orderForm.symbol, 
          side, 
          this.orderForm.quantity
        );

        if (executionPrice > 0) {
          const total = executionPrice * this.orderForm.quantity;

          if (side === 'BUY') {
            this.tradingService.addPosition(this.orderForm.symbol, this.orderForm.quantity, executionPrice);
            this.tradingService.debitCash(total);
          } else {
            this.tradingService.removePosition(this.orderForm.symbol, this.orderForm.quantity);
            this.tradingService.creditCash(total);
          }

          console.log(`✅ Ordre LIMIT exécuté automatiquement: ${this.orderForm.quantity} ${this.orderForm.symbol} @ ${executionPrice.toFixed(2)}€`);
          
          this.pendingOrderId = null; // Ordre exécuté
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/trading']);
  }
}