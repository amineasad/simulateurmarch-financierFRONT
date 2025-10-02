// src/app/components/trading-room/trading-room.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { WebsocketService } from '../../services/websocket.service';
import { TradingService } from '../../services/trading.service';
import { Router } from '@angular/router';
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
  // État de la connexion
  isConnected = false;
  currentTime = new Date();
  
  // Données du marché
  assets: Asset[] = [];
  selectedAsset: Asset | null = null;
  selectedSymbol = 'AAPL';
  
  // Portfolio
  portfolio: Position[] = [];
  cash = 100000;
  totalPortfolioValue = 0;
  totalPnL = 0;
  
  // Carnet d'ordres
  orderBook: OrderBook = {
    bids: [],
    asks: []
  };
  
  // Formulaire d'ordre
  orderForm: Order = {
    userId: 'user-' + Math.random().toString(36).substr(2, 9),
    symbol: 'AAPL',
    type: 'LIMIT',
    side: 'BUY',
    price: 0,
    quantity: 100
  };
  
  // Notifications et Chat
  notifications: Notification[] = [];
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  username = 'TraderPro_' + Math.floor(Math.random() * 1000);
  
  // Statistiques
  onlineTraders = 24;
  latency = 12;
  ordersToday = 0;
  volumeToday = 0;
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  constructor(
    private wsService: WebsocketService,
    private tradingService: TradingService,
    private router: Router,
  ) {}
  

  ngOnInit(): void {
    // Démarrer l'horloge
    this.startClock();
    
    // Charger les données initiales
    this.loadInitialData();
    
    // Connexion WebSocket
    this.connectToWebSocket();
    
    // Charger le carnet d'ordres mock
    this.loadMockOrderBook();
  }

  /**
   * Démarrer l'horloge
   */
  private startClock(): void {
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  /**
   * Charger les données initiales
   */
  private loadInitialData(): void {
    // Charger les assets
    const assetsSub = this.tradingService.getAssets().subscribe(assets => {
      this.assets = assets;
      this.updateSelectedAsset();
    });
    this.subscriptions.push(assetsSub);

    // Charger le portfolio
    const portfolioSub = this.tradingService.getPortfolio().subscribe(portfolio => {
      this.portfolio = portfolio;
      this.calculatePortfolioStats();
    });
    this.subscriptions.push(portfolioSub);

    // Charger le cash
    const cashSub = this.tradingService.getCash().subscribe(cash => {
      this.cash = cash;
    });
    this.subscriptions.push(cashSub);

    // Observer l'asset sélectionné
    const selectedSub = this.tradingService.getSelectedAsset().subscribe(symbol => {
      this.selectedSymbol = symbol;
      this.updateSelectedAsset();
      this.orderForm.symbol = symbol;
    });
    this.subscriptions.push(selectedSub);
  }

  /**
   * Connexion au WebSocket
   */
  private async connectToWebSocket(): Promise<void> {
    try {
      await this.wsService.connect();
      this.isConnected = true;
      
      this.addNotification('success', 'Connecté au serveur de trading');

      // S'abonner aux mises à jour du marché
      const marketSub = this.wsService.getMarketUpdates().subscribe(
        (update: MarketUpdate) => this.handleMarketUpdate(update)
      );
      this.subscriptions.push(marketSub);

      // S'abonner au chat
      const chatSub = this.wsService.getChatMessages().subscribe(
        (message: ChatMessage) => this.handleChatMessage(message)
      );
      this.subscriptions.push(chatSub);

      // Observer l'état de connexion
      const connSub = this.wsService.getConnectionStatus().subscribe(
        status => this.isConnected = status
      );
      this.subscriptions.push(connSub);

    } catch (error) {
      console.error('Erreur de connexion:', error);
      this.addNotification('error', 'Échec de connexion au serveur');
      this.isConnected = false;
    }
  }

  /**
   * Gérer les mises à jour du marché
   */
  private handleMarketUpdate(update: MarketUpdate): void {
    console.log('📊 Mise à jour marché:', update);
    
    // Mettre à jour le prix
    this.tradingService.updateAssetPrice(update.symbol, update.price, 0);
    
    // Si c'est notre ordre qui a été exécuté
    if (update.executedOrder && update.executedOrder.userId === this.orderForm.userId) {
      this.addNotification('success', update.message);
      this.ordersToday++;
      
      // Mettre à jour le portfolio
      const order = update.executedOrder;
      if (order.side === 'BUY') {
        this.tradingService.addPosition(order.symbol, order.quantity, order.price);
        this.tradingService.updateCash(-order.price * order.quantity);
      } else {
        this.tradingService.removePosition(order.symbol, order.quantity);
        this.tradingService.updateCash(order.price * order.quantity);
      }
      
      this.volumeToday += order.price * order.quantity;
    }
  }

  /**
   * Gérer les messages du chat
   */
  private handleChatMessage(message: ChatMessage): void {
    this.chatMessages.unshift(message);
    if (this.chatMessages.length > 50) {
      this.chatMessages.pop();
    }
  }

  /**
   * Mettre à jour l'asset sélectionné
   */
  private updateSelectedAsset(): void {
    this.selectedAsset = this.assets.find(a => a.symbol === this.selectedSymbol) || null;
    if (this.selectedAsset) {
      this.orderForm.price = this.selectedAsset.price;
    }
  }

  /**
   * Calculer les statistiques du portfolio
   */
  private calculatePortfolioStats(): void {
    this.totalPortfolioValue = this.tradingService.getTotalPortfolioValue();
    this.totalPnL = this.tradingService.getTotalPnL();
  }

  /**
   * Charger un carnet d'ordres mock
   */
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

  /**
   * Sélectionner un asset
   */
  selectAsset(symbol: string): void {
    this.tradingService.selectAsset(symbol);
  }

  /**
   * Passer un ordre
   */
  placeOrder(): void {
    if (!this.isConnected) {
      this.addNotification('error', 'Non connecté au serveur');
      return;
    }

    // Validation
    if (this.orderForm.quantity <= 0) {
      this.addNotification('error', 'Quantité invalide');
      return;
    }

    if (this.orderForm.side === 'BUY') {
      const total = this.orderForm.price * this.orderForm.quantity;
      if (total > this.cash) {
        this.addNotification('error', 'Fonds insuffisants');
        return;
      }
    } else {
      const position = this.tradingService.getPosition(this.orderForm.symbol);
      if (!position || position.quantity < this.orderForm.quantity) {
        this.addNotification('error', 'Position insuffisante pour vendre');
        return;
      }
    }

    // Envoyer l'ordre
    const order: Order = {
      ...this.orderForm,
      timestamp: new Date()
    };

    this.wsService.sendOrder(order);
    this.addNotification('info', `Ordre envoyé: ${order.side} ${order.quantity} ${order.symbol}`);
  }

  /**
   * Envoyer un message dans le chat
   */
  sendChatMessage(): void {
    if (this.chatInput.trim() && this.isConnected) {
      this.wsService.sendChatMessage(this.chatInput, this.username);
      this.chatInput = '';
    }
  }

  /**
   * Ajouter une notification
   */
  private addNotification(type: 'success' | 'info' | 'warning' | 'error', message: string): void {
    const notification: Notification = {
      id: Date.now(),
      type: type,
      message: message,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    this.notifications.unshift(notification);
    
    // Garder seulement les 10 dernières
    if (this.notifications.length > 10) {
      this.notifications.pop();
    }
  }

  /**
   * Calculer le P&L d'une position
   */
  getPositionPnL(position: Position): number {
    return position.quantity * (position.currentPrice - position.avgPrice);
  }

  /**
   * Calculer le P&L en pourcentage d'une position
   */
  getPositionPnLPercent(position: Position): number {
    return ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100;
  }

  /**
   * Calculer le total d'un ordre
   */
  getOrderTotal(): number {
    return this.orderForm.price * this.orderForm.quantity;
  }

  /**
   * Changer le type d'ordre
   */
  changeOrderType(type: 'MARKET' | 'LIMIT' | 'STOP'): void {
    this.orderForm.type = type;
  }

  /**
   * Changer le côté de l'ordre
   */
  changeOrderSide(side: 'BUY' | 'SELL'): void {
    this.orderForm.side = side;
  }

  ngOnDestroy(): void {
    // Désabonnement
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Déconnexion WebSocket
    this.wsService.disconnect();
  }
  goToLobby(): void {
  this.router.navigate(['/lobby']);
}
}