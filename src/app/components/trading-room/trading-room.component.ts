// ===============================================
// ✅ TRADING ROOM COMPONENT (version complète avec catégories Finnhub)
// ===============================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { WebsocketService } from '../../services/websocket.service';
import { TradingService, AssetCategory } from '../../services/trading.service';
import { WalletService } from '../../services/wallet.service';
import { AuthService } from '../../services/auth.service';
import {
  Asset,
  Order,
  Position,
  OrderBook,
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

  // ========= CARNET D’ORDRES =========
  orderBook: OrderBook = { bids: [], asks: [] };

  // ========= FORMULAIRE D’ORDRE =========
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
  onlineTraders = 24;
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
    private router: Router
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
    this.loadMockOrderBook();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.wsService.disconnect();
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
    // ---- liste des actifs
    const assetsSub = this.tradingService.getAssets().subscribe(assets => {
      this.assets = assets;
      this.updateSelectedAsset();
    });
    this.subscriptions.push(assetsSub);

    // ---- portfolio
    const portfolioSub = this.tradingService.getPortfolio().subscribe(pf => {
      this.portfolio = pf;
      this.calculatePortfolioStats();
    });
    this.subscriptions.push(portfolioSub);

    // ---- symbole sélectionné
    const selectedSub = this.tradingService.getSelectedAsset().subscribe(symbol => {
      this.selectedSymbol = symbol;
      this.updateSelectedAsset();
      this.orderForm.symbol = symbol;
    });
    this.subscriptions.push(selectedSub);

    // ---- catégorie sélectionnée (nouveau)
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
  }

  /**
   * Sélectionner un actif dans la watchlist
   */
  selectAsset(symbol: string): void {
    this.tradingService.selectAsset(symbol);
  }

  /**
   * Mettre à jour l’actif sélectionné (pour le graphique + header)
   */
  private updateSelectedAsset(): void {
    this.selectedAsset = this.assets.find(a => a.symbol === this.selectedSymbol) || null;
    if (this.selectedAsset) this.orderForm.price = this.selectedAsset.price;
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
    if (!this.isConnected) return this.addNotification('error', 'Non connecté au serveur');

    if (this.orderForm.quantity <= 0) return this.addNotification('error', 'Quantité invalide');

    if (this.orderForm.side === 'BUY') {
      const total = this.orderForm.price * this.orderForm.quantity;
      if (total > this.cash) return this.addNotification('error', 'Fonds insuffisants');
    } else {
      const pos = this.tradingService.getPosition(this.orderForm.symbol);
      if (!pos || pos.quantity < this.orderForm.quantity)
        return this.addNotification('error', 'Position insuffisante');
    }

    const order: Order = { ...this.orderForm, timestamp: new Date() };
    this.wsService.sendOrder(order);
    this.addNotification('info', `Ordre envoyé: ${order.side} ${order.quantity} ${order.symbol}`);
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
  // 🔹 MOCK ORDER BOOK
  // ===============================================================
  private loadMockOrderBook(): void {
    this.orderBook = {
      bids: [
        { price: 178.48, quantity: 1250 },
        { price: 178.45, quantity: 890 },
        { price: 178.42, quantity: 2100 },
        { price: 178.40, quantity: 1500 },
        { price: 178.38, quantity: 750 }
      ],
      asks: [
        { price: 178.52, quantity: 980 },
        { price: 178.55, quantity: 1420 },
        { price: 178.58, quantity: 670 },
        { price: 178.60, quantity: 1890 },
        { price: 178.62, quantity: 1100 }
      ]
    };
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
}
