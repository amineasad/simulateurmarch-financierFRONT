// ===============================================
// ✅ TRADING ROOM COMPONENT - VERSION COMPLÈTE AVEC ORDERBOOK
// ===============================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { Router } from '@angular/router';
import { WebsocketService } from '../../services/websocket.service';
import { TradingService, AssetCategory } from '../../services/trading.service';
import { WalletService } from '../../services/wallet.service';
import { AuthService } from '../../services/auth.service';
import { LocalOrderBookService, LocalOrderBook } from '../../services/local-orderbook.service';
import {
  Asset,
  Order,
  Position,
  Notification,
  ChatMessage,
  MarketUpdate
} from '../../models/market.model';

@Component({
  selector: 'app-trading-room',
  templateUrl: './trading-room.component.html',
  styleUrls: ['./trading-room.component.css']
})
export class TradingRoomComponent implements OnInit, OnDestroy {
  // ========= ÉTAT GLOBAL =========
  isConnected = false;
  currentTime = new Date();

  // ========= DONNÉES MARCHÉ =========
  assets: Asset[] = [];
  selectedAsset: Asset | null = null;
  selectedSymbol = 'AAPL';
  selectedCategory: AssetCategory = 'STOCKS';

  // ========= PORTFOLIO =========
  portfolio: Position[] = [];
  cash = 0;
  totalPortfolioValue = 0;
  totalPnL = 0;

  // ========= CARNET D'ORDRES =========
  currentOrderBook: LocalOrderBook | null = null;
  private orderBookRefreshSub?: Subscription;

  // ========= FORMULAIRE D'ORDRE =========
  orderForm: Order = {
    userId: 'user-' + Math.random().toString(36).substr(2, 9),
    symbol: 'AAPL',
    type: 'LIMIT',
    side: 'BUY',
    price: 0,
    quantity: 100
  };

  // ========= NOTIFICATIONS / CHAT =========
  notifications: Notification[] = [];
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  username = '';

  // ========= STATISTIQUES =========
  latency = 12;
  ordersToday = 0;
  volumeToday = 0;

  // ========= SUBSCRIPTIONS =========
  private subscriptions: Subscription[] = [];

  constructor(
    private wsService: WebsocketService,
    private tradingService: TradingService,
    private walletService: WalletService,
    private authService: AuthService,
    private router: Router,
    private localOrderBookService: LocalOrderBookService
  ) {}

  // ===============================================================
  // 🧩 INITIALISATION
  // ===============================================================
  ngOnInit(): void {
    this.loadUsername();
    this.startClock();
    this.loadInitialData();
    this.loadWalletBalance();
    this.connectToWebSocket();
    this.loadOrderBookForSelectedSymbol();
    this.syncOrderBooksWithMarketPrices();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.wsService.disconnect();
    
    if (this.orderBookRefreshSub) {
      this.orderBookRefreshSub.unsubscribe();
    }
  }

  // ===============================================================
  // 🔹 UTILISATEUR / AUTH
  // ===============================================================
  private loadUsername(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      if (user.prenom && user.nom) this.username = `${user.prenom} ${user.nom}`;
      else if (user.prenom) this.username = user.prenom;
      else if (user.email) this.username = user.email.split('@')[0];
      else this.username = 'Trader';
    } else {
      this.username = 'Invité';
    }
    console.log('✅ Username chargé:', this.username);
  }

  // ===============================================================
  // 🔹 HORLOGE
  // ===============================================================
  private startClock(): void {
    setInterval(() => (this.currentTime = new Date()), 1000);
  }

  // ===============================================================
  // 🔹 WALLET
  // ===============================================================
  private loadWalletBalance(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !user.id) return;

    this.walletService.getWallet(user.id).subscribe({
      next: wallet => {
        this.cash = wallet.balance;
        console.log('💰 Cash chargé:', this.cash);
      },
      error: err => {
        console.error('Erreur chargement wallet:', err);
        this.cash = 0;
        this.addNotification('error', 'Impossible de charger le solde');
      }
    });
  }

  // ===============================================================
  // 🔹 MARCHÉ / ASSETS
  // ===============================================================
  private loadInitialData(): void {
    // Liste des actifs
    const assetsSub = this.tradingService.getAssets().subscribe(assets => {
      this.assets = assets;
      this.updateSelectedAsset();
    });
    this.subscriptions.push(assetsSub);

    // Portfolio
    const portfolioSub = this.tradingService.getPortfolio().subscribe(pf => {
      this.portfolio = pf;
      this.calculatePortfolioStats();
    });
    this.subscriptions.push(portfolioSub);

    // Symbole sélectionné
    const selectedSub = this.tradingService.getSelectedAsset().subscribe(symbol => {
      this.selectedSymbol = symbol;
      this.updateSelectedAsset();
      this.orderForm.symbol = symbol;
    });
    this.subscriptions.push(selectedSub);

    // Catégorie sélectionnée
    const catSub = this.tradingService.getSelectedCategory().subscribe(cat => {
      this.selectedCategory = cat;
    });
    this.subscriptions.push(catSub);
  }

  /**
   * ✅ Changer de catégorie (ACTIONS / FOREX / MÉTAUX / ETF)
   */
  changeCategory(cat: AssetCategory): void {
    this.tradingService.setSelectedCategory(cat);
    
    setTimeout(() => {
      this.loadOrderBookForSelectedSymbol();
    }, 200);
  }

  /**
   * Sélectionner un actif dans la watchlist
   */
  selectAsset(symbol: string): void {
    this.tradingService.selectAsset(symbol);
    this.loadOrderBookForSelectedSymbol();
  }

  /**
   * Mettre à jour l'actif sélectionné
   */
  private updateSelectedAsset(): void {
    this.selectedAsset = this.assets.find(a => a.symbol === this.selectedSymbol) || null;
    if (this.selectedAsset) this.orderForm.price = this.selectedAsset.price;
  }

  // ===============================================================
  // 🔹 ORDERBOOK
  // ===============================================================
  
  /**
   * ✅ Charger le carnet du symbole sélectionné
   */
  /**
 * ✅ Charger le carnet du symbole sélectionné
 */
private loadOrderBookForSelectedSymbol(): void {
  console.log(`📖 Chargement carnet pour ${this.selectedSymbol}`);
  
  this.localOrderBookService.getOrderBook(this.selectedSymbol).subscribe(book => {
    this.currentOrderBook = book;
    console.log(`✅ Carnet chargé pour ${this.selectedSymbol}:`, book);
    
    // ✅ NOUVEAU : Mettre à jour BID/ASK depuis le carnet
    if (book && this.selectedAsset) {
      if (book.bids.length > 0) {
        this.selectedAsset.bid = book.bids[0].price;
      }
      if (book.asks.length > 0) {
        this.selectedAsset.ask = book.asks[0].price;
      }
      this.selectedAsset.price = book.lastPrice;
    }
  });

  if (this.orderBookRefreshSub) {
    this.orderBookRefreshSub.unsubscribe();
  }

  this.orderBookRefreshSub = interval(3000).subscribe(() => {
    this.localOrderBookService.getOrderBook(this.selectedSymbol).subscribe(book => {
      this.currentOrderBook = book;
      
      // ✅ NOUVEAU : Mise à jour continue BID/ASK
      if (book && this.selectedAsset) {
        if (book.bids.length > 0) {
          this.selectedAsset.bid = book.bids[0].price;
        }
        if (book.asks.length > 0) {
          this.selectedAsset.ask = book.asks[0].price;
        }
        this.selectedAsset.price = book.lastPrice;
      }
    });
  });
}

  /**
   * ✅ Synchroniser les carnets avec les prix réels
   */
  private syncOrderBooksWithMarketPrices(): void {
    this.tradingService.getAssets().subscribe(assets => {
      assets.forEach(asset => {
        if (asset.price > 0) {
          this.localOrderBookService.updateMarketPrice(asset.symbol, asset.price);
        }
      });
    });
  }

  /**
   * ✅ Helper pour les barres de profondeur
   */
  getOrderBookMaxQuantity(side: 'bids' | 'asks'): number {
    if (!this.currentOrderBook) return 1;
    
    const entries = side === 'bids' 
      ? this.currentOrderBook.bids 
      : this.currentOrderBook.asks;
    
    if (entries.length === 0) return 1;
    
    return Math.max(...entries.map(e => e.quantity), 1);
  }

  // ===============================================================
  // 🔹 WEBSOCKET / MARKET DATA
  // ===============================================================
  private async connectToWebSocket(): Promise<void> {
    try {
      await this.wsService.connect();
      this.isConnected = true;
      this.addNotification('success', 'Connecté au serveur de trading');

      // Messages de chat
      const chatSub = this.wsService.getChatMessages().subscribe(msg => this.handleChatMessage(msg));
      this.subscriptions.push(chatSub);

      // État de connexion
      const connSub = this.wsService.getConnectionStatus().subscribe(st => (this.isConnected = st));
      this.subscriptions.push(connSub);
    } catch (error) {
      console.error('Erreur de connexion WebSocket:', error);
      this.isConnected = false;
      this.addNotification('error', 'Échec de connexion au serveur');
    }
  }

  private handleChatMessage(message: ChatMessage): void {
    this.chatMessages.unshift(message);
    if (this.chatMessages.length > 50) this.chatMessages.pop();
  }

  private handleMarketUpdate(update: MarketUpdate): void {
    console.log('📊 Update marché:', update);
    this.tradingService.updateAssetPrice(update.symbol, update.price, 0);
  }

  // ===============================================================
  // 🔹 ORDRES
  // ===============================================================
  placeOrder(): void {
    if (!this.isConnected) {
      return this.addNotification('error', 'Non connecté au serveur');
    }

    if (this.orderForm.quantity <= 0) {
      return this.addNotification('error', 'Quantité invalide');
    }

    const symbol = this.orderForm.symbol;
    const side = this.orderForm.side;
    const quantity = this.orderForm.quantity;
    const type = this.orderForm.type;

    // Validation BUY
    if (side === 'BUY') {
      const total = this.orderForm.price * quantity;
      if (total > this.cash) {
        return this.addNotification('error', `Fonds insuffisants (disponible: ${this.cash.toFixed(2)}€)`);
      }
    }

    // Validation SELL
    if (side === 'SELL') {
      const pos = this.tradingService.getPosition(symbol);
      if (!pos || pos.quantity < quantity) {
        return this.addNotification('error', 'Position insuffisante');
      }
    }

    let executionPrice: number;

    if (type === 'MARKET') {
      // ✅ MARKET : Exécuter immédiatement
      executionPrice = this.localOrderBookService.executeMarketOrder(symbol, side, quantity);
      
      if (executionPrice === 0) {
        return this.addNotification('error', 'Pas de liquidité disponible');
      }

      if (side === 'BUY') {
        this.tradingService.addPosition(symbol, quantity, executionPrice);
        this.cash -= executionPrice * quantity;
      } else {
        this.tradingService.removePosition(symbol, quantity);
        this.cash += executionPrice * quantity;
      }

      this.addNotification(
        'success', 
        `✅ MARKET ${side === 'BUY' ? 'Achat' : 'Vente'}: ${quantity} ${symbol} @ ${executionPrice.toFixed(2)}€`
      );

    } else {
      // ✅ LIMIT : Ajouter au carnet
      const limitPrice = this.orderForm.price;
      
      this.localOrderBookService.addLimitOrder(symbol, side, limitPrice, quantity);
      
      this.addNotification(
        'info', 
        `⏳ LIMIT ${side === 'BUY' ? 'Achat' : 'Vente'}: ${quantity} ${symbol} @ ${limitPrice.toFixed(2)}€`
      );

      // Simuler l'exécution après 3-5 secondes
      const executionDelay = 3000 + Math.random() * 2000;
      
      setTimeout(() => {
        if (side === 'BUY') {
          this.tradingService.addPosition(symbol, quantity, limitPrice);
          this.cash -= limitPrice * quantity;
        } else {
          this.tradingService.removePosition(symbol, quantity);
          this.cash += limitPrice * quantity;
        }
        
        this.addNotification('success', `✅ LIMIT exécuté: ${quantity} ${symbol} @ ${limitPrice.toFixed(2)}€`);
        this.loadOrderBookForSelectedSymbol();
      }, executionDelay);
    }

    // Recharger le carnet
    this.loadOrderBookForSelectedSymbol();
    this.calculatePortfolioStats();

    // Envoyer via WebSocket (pour le mock)
    const order: Order = { ...this.orderForm, timestamp: new Date() };
    this.wsService.sendOrder(order);
  }

  // ===============================================================
  // 🔹 PORTFOLIO
  // ===============================================================
  private calculatePortfolioStats(): void {
    this.totalPortfolioValue = this.tradingService.getTotalPortfolioValue();
    this.totalPnL = this.tradingService.getTotalPnL();
  }

  getPositionPnL(p: Position): number {
    return p.quantity * (p.currentPrice - p.avgPrice);
  }

  getPositionPnLPercent(p: Position): number {
    return ((p.currentPrice - p.avgPrice) / p.avgPrice) * 100;
  }

  // ===============================================================
  // 🔹 CHAT / NOTIFS
  // ===============================================================
  sendChatMessage(): void {
    if (this.chatInput.trim() && this.isConnected) {
      this.wsService.sendChatMessage(this.chatInput, this.username);
      this.chatInput = '';
    }
  }

  private addNotification(
    type: 'success' | 'info' | 'warning' | 'error',
    message: string
  ): void {
    const notif: Notification = {
      id: Date.now(),
      type,
      message,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    this.notifications.unshift(notif);
    if (this.notifications.length > 10) this.notifications.pop();
  }

  // ===============================================================
  // 🔹 NAVIGATION
  // ===============================================================
  goToOrders(): void {
    this.router.navigate(['/orders']);
  }

  goToPortfolio(): void {
    this.router.navigate(['/portfolio']);
  }

  goToWallet(): void {
    this.router.navigate(['/wallet/manage']);
  }

  goToLobby(): void {
    this.router.navigate(['/lobby']);
  }

  goToDetails(): void {
    this.router.navigate(['/prices']);
  }

  goToEducation(): void {
    this.router.navigate(['/education']);
  }
}