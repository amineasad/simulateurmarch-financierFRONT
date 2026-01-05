// src/app/components/gaming-room/gaming-room.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';

import { TradingSessionService, TimeScaleStats } from '../../services/trading-session.service';
import { AuthService } from '../../services/auth.service';
import { PortfolioService } from '../../services/portfolio.service';
import { AllocationRequest, AllocationResult } from '../../models/allocation.models';
import { PatternAIService } from '../../services/pattern-ai.service';
import { TraderAnalysisService } from '../../services/trader-analysis.service';


import {
  TradingSession,
  SessionParticipation,
  SessionOrder,
  SessionStatus,
  OrderSide,
  OrderStatus,
  OrderType
} from '../../models/trading-session.model';
import { MarketDataService, Quote } from '../../services/market-data.service';
import { SessionOrderBookService } from '../../services/session-order-book.service';
import { SessionOrderBookDepth } from '../../models/market.model';

// ✅ AJOUT REPLAY
import { MarketReplayService, MarketTick, ReplayStats } from '../../services/market-replay.service';

export type AssetCategory = 'STOCKS' | 'FOREX' | 'METALS' | 'ETFS';

interface StockData {
  price: number;
  change: number;
  changePercent: number;
}

interface ActivityItem {
  text: string;
  time: string;
  type: 'buy' | 'sell' | 'info';
}

type PositionRow = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  lastPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
};

@Component({
  selector: 'app-gaming-room',
  templateUrl: './gaming-room.component.html',
  styleUrls: ['./gaming-room.component.css']
})
export class GamingRoomComponent implements OnInit, OnDestroy {
  // Enums pour le template
  SessionStatus = SessionStatus;
  OrderSide = OrderSide;
  OrderType = OrderType;

  // ====== Catégories d'actifs ======
  selectedCategory: AssetCategory = 'STOCKS';

  private stockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'PYPL', 'INTC', 'AMD'];
  private forexSymbols = ['EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP'];
  private metalSymbols = ['XAU/USD', 'XAG/USD', 'XPT/USD', 'XPD/USD'];
  private etfSymbols = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VWO', 'EEM', 'GLD', 'SLV', 'TLT'];

  symbols: string[] = [];

  // ====== Session & utilisateur ======
  sessionId!: number;
  session: TradingSession | null = null;
  currentUser: any;
  myParticipation: SessionParticipation | null = null;

  // ====== Timer (time scaling backend) ======
  timeRemaining = '--:--';
  sessionProgress = 0;
  virtualMarketTime = '09:30';
  tradingPhase = 'PRE_MARKET';
  timeScaleFactor = 1.0;
  isMarketOpen = false;
  private timerSub?: Subscription;

  // ====== Marché (données de prix) ======
  marketData: Record<string, StockData> = {};
  private quotesSub?: Subscription;

  // ====== Trading ======
  selectedSymbol = 'AAPL';
  orderType: OrderType = OrderType.MARKET;
  orderSide: OrderSide = OrderSide.BUY;
  orderQuantity = 10;
  orderPrice = 0;

  // ====== Feed d'activité ======
  activityFeed: ActivityItem[] = [];

  // ====== Carnet d'ordres ======
  depth?: SessionOrderBookDepth;
  allocationResult: AllocationResult | null = null;
isAllocating = false;

// Capital par défaut (tu peux changer)
allocationCapital = 10000;

// Stratégie par défaut
allocationStrategy: 'MAX_RETURN' | 'LOW_VOL' = 'MAX_RETURN';
//patterns
aiSignal: string | null = null;
aiConfidence: number | null = null;
aiRecommendations: string[] = [];
aiLoading = false;
aiStrategies: any[] = [];

  // ====== Mapping vers TradingView ======
  private symbolMap: Record<string, string> = {
    'AAPL': 'NASDAQ:AAPL',
    'MSFT': 'NASDAQ:MSFT',
    'GOOGL': 'NASDAQ:GOOGL',
    'AMZN': 'NASDAQ:AMZN',
    'TSLA': 'NASDAQ:TSLA',
    'META': 'NASDAQ:META',
    'NVDA': 'NASDAQ:NVDA',
    'NFLX': 'NASDAQ:NFLX',
    'EUR/USD': 'FX:EURUSD',
    'USD/JPY': 'FX:USDJPY',
    'GBP/USD': 'FX:GBPUSD',
    'XAU/USD': 'TVC:GOLD',
    'XAG/USD': 'TVC:SILVER'
  };

  get tradingViewSymbol(): string {
    return this.symbolMap[this.selectedSymbol] || 'NASDAQ:AAPL';
  }

  // ====== Loading / UI ======
  isPlacingOrder = false;
  lastOrderError = '';

  // ====== Positions ======
  myPositions: PositionRow[] = [];
  trackBySymbol = (_: number, p: PositionRow) => p.symbol;

  // ====== ✅ REPLAY : état du mode replay avec RALENTI ======
  isReplayMode = false;
  replayProgress = 0;
  replayVirtualTime = '';
  replayIsPlaying = false;
  replayCurrentSpeed = 1.0;
  
  // ✨ NOUVEAUX : Ralentis + Accélérations
  availableSpeeds = [
    { value: 0.1, label: '×0.1 (très lent)' },
    { value: 0.25, label: '×0.25 (lent)' },
    { value: 0.5, label: '×0.5 (ralenti)' },
    { value: 1, label: '×1 (normal)' },
    { value: 10, label: '×10' },
    { value: 100, label: '×100' },
    { value: 1000, label: '×1000' },
    { value: 2100, label: '×2100 (max)' }
  ];

  private replayDataSub?: Subscription;
  private replayStatsSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private sessionService: TradingSessionService,
    private authService: AuthService,
    private marketDataService: MarketDataService,
    private sessionOrderBookService: SessionOrderBookService,
    private portfolioService: PortfolioService, 
    private patternAI: PatternAIService,
    private traderAnalysis: TraderAnalysisService,// 👈 ajout ici
    private replayService: MarketReplayService,
  ) {}

  // ==================== CYCLE DE VIE ====================
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadCategorySymbols('STOCKS');

    this.route.params.subscribe(params => {
      this.sessionId = +params['id'];
      this.loadSession();
      this.loadTraderAnalysis();

    });

    this.route.queryParams.subscribe(query => {
      this.isReplayMode = query['mode'] === 'replay';

      if (this.isReplayMode) {
        this.initReplayMode();
      } else {
        this.initLiveMode();
      }
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.quotesSub?.unsubscribe();
    this.replayDataSub?.unsubscribe();
    this.replayStatsSub?.unsubscribe();
    this.replayService.disconnect();
    this.marketDataService.stopPolling();
  }

  // ==================== CATÉGORIES D'ACTIFS ====================
  changeCategory(cat: AssetCategory): void {
    if (cat === this.selectedCategory) return;

    this.selectedCategory = cat;
    this.loadCategorySymbols(cat);

    if (this.symbols.length > 0) {
      this.selectSymbol(this.symbols[0]);
    }

    if (!this.isReplayMode) {
      this.marketDataService.startPolling(this.symbols, 2000);
    }
  }

  private loadCategorySymbols(cat: AssetCategory): void {
    switch (cat) {
      case 'STOCKS':
        this.symbols = [...this.stockSymbols];
        break;
      case 'FOREX':
        this.symbols = [...this.forexSymbols];
        break;
      case 'METALS':
        this.symbols = [...this.metalSymbols];
        break;
      case 'ETFS':
        this.symbols = [...this.etfSymbols];
        break;
    }
  }

  // ==================== SESSION ====================
  loadSession(): void {
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: (s) => {
        this.session = s;
        this.loadParticipation();
        this.loadPositions();
        this.startTimer();
        this.loadRecentActivity();
      },
      error: (e) => {
        console.error('Erreur chargement session', e);
        alert('Session introuvable');
        this.router.navigate(['/lobby']);
      }
    });
  }

  private loadParticipation(): void {
    this.sessionService
      .getParticipation(this.sessionId, this.currentUser.id)
      .subscribe({
        next: (p) => { this.myParticipation = p; },
        error: (e) => { console.error('Erreur chargement participation', e); }
      });
  }

  private loadPositions(): void {
    this.sessionService
      .getPositions(this.sessionId, this.currentUser.id)
      .subscribe({
        next: (rows: any[]) => {
          this.myPositions = (rows || []).map(r =>
            this.enrichPosition(r.symbol, r.quantity, r.avgPrice)
          );
          this.sortPositions();
        },
        error: (e) => {
          console.error('Erreur chargement positions', e);
        }
      });
  }

  private enrichPosition(symbol: string, quantity: number, avgPrice: number): PositionRow {
    const last = this.marketData[symbol]?.price ?? 0;
    const value = quantity * last;
    const pnl = (last - avgPrice) * quantity;
    const pnlPct = avgPrice > 0 ? ((last - avgPrice) / avgPrice) * 100 : 0;
    return {
      symbol,
      quantity,
      avgPrice,
      lastPrice: last,
      marketValue: value,
      unrealizedPnL: pnl,
      unrealizedPnLPercent: pnlPct
    };
  }

  private recomputePositionsFromQuotes(): void {
    if (!this.myPositions?.length) return;
    this.myPositions = this.myPositions.map(p =>
      this.enrichPosition(p.symbol, p.quantity, p.avgPrice)
    );
    this.sortPositions();
  }

  private sortPositions(): void {
    this.myPositions.sort((a, b) => b.marketValue - a.marketValue);
  }

  private loadRecentActivity(): void {
    this.sessionService.getActivityFeed(this.sessionId).subscribe({
      next: (orders) => {
        this.activityFeed = orders.slice(0, 15).map(o => ({
          text: `${o.side === OrderSide.BUY ? '🟢 Achat' : '🔴 Vente'} ${o.quantity} ${o.symbol} @ ${(o.executionPrice ?? o.price)?.toFixed(2)}€`,
          time: new Date(o.executionTime ?? o.orderTime ?? '').toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          type: o.side === OrderSide.BUY ? 'buy' : 'sell'
        }));
      }
    });
  }

  // ==================== TIMER (TimeScaleManager) ====================
  private startTimer(): void {
    this.timerSub = interval(2000).subscribe(() => {
      this.updateTimerWithTimeScale();
    });
  }

  private updateTimerWithTimeScale(): void {
    if (!this.session) return;

    this.sessionService.getTimeStats(this.sessionId).subscribe({
      next: (stats: TimeScaleStats) => {
        this.virtualMarketTime = stats.virtualMarketTime || '09:30';
        this.tradingPhase = stats.tradingPhase || 'PRE_MARKET';
        this.isMarketOpen = stats.isMarketOpen;
        this.timeScaleFactor = stats.timeScaleFactor;
        this.sessionProgress = stats.progressPercentage * 100;

        const mins = stats.realMinutesRemaining;
        if (mins > 60) {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          this.timeRemaining = `${h}h ${m}min`;
        } else {
          this.timeRemaining = `${mins}min`;
        }
      },
      error: (err) => {
        console.error('Erreur récupération time stats', err);
      }
    });
  }

  // ==================== MODE LIVE ====================
  private initLiveMode(): void {
    console.log('🎮 Mode Live activé');

    this.marketDataService.startPolling(this.symbols, 2000);
    this.quotesSub = this.marketDataService.streamQuotes().subscribe(
      (map: Record<string, Quote>) => {
        for (const s of this.symbols) {
          const q = map[s];
          if (!q) continue;
          this.marketData[s] = {
            price: q.price,
            change: q.change,
            changePercent: q.changePercent
          };
        }

        if (this.orderType === OrderType.LIMIT) {
          const currentPrice = this.marketData[this.selectedSymbol]?.price;
          if (currentPrice && this.orderPrice === 0) {
            this.orderPrice = currentPrice;
          }
        }

        this.recomputePositionsFromQuotes();
      }
    );
  }

 // ========================================
// MODIFIER initReplayMode() existant
// ========================================

private initReplayMode(): void {
  console.log('📼 Mode Replay activé');

  this.replayService.connectToSession(this.sessionId);

  this.replayDataSub = this.replayService.getMarketData().subscribe(
    (tick: MarketTick) => {
      this.handleReplayTick(tick);
    }
  );

  this.replayStatsSub = this.replayService.getReplayStats().subscribe(
    (stats: ReplayStats) => {
      this.replayProgress = stats.progress;
      this.replayVirtualTime = stats.virtualTime;
      this.replayIsPlaying = stats.isPlaying;
      this.replayCurrentSpeed = stats.speedMultiplier;
    }
  );
  
   // ✨ NOUVEAU : Générer le carnet initial si prix déjà disponible
  setTimeout(() => {
    const currentPrice = this.marketData[this.selectedSymbol]?.price;
    if (currentPrice && currentPrice > 0) {
      this.generateSyntheticOrderBook(this.selectedSymbol, currentPrice);
    }
  }, 1000);
}

 // ========================================
// MODIFIER handleReplayTick() existant
// ========================================

private handleReplayTick(tick: MarketTick): void {
  if (!this.marketData[tick.symbol]) {
    this.marketData[tick.symbol] = {
      price: 0,
      change: 0,
      changePercent: 0
    };
  }

  const prevPrice = this.marketData[tick.symbol].price;
  const newPrice = tick.close;

  this.marketData[tick.symbol] = {
    price: newPrice,
    change: newPrice - prevPrice,
    changePercent: prevPrice > 0 ? ((newPrice - prevPrice) / prevPrice) * 100 : 0
  };

  this.recomputePositionsFromQuotes();

  // ✨ NOUVEAU : Regénérer le carnet pour le symbole sélectionné
  if (tick.symbol === this.selectedSymbol && newPrice > 0) {
    this.generateSyntheticOrderBook(tick.symbol, newPrice);
  }
}
  private generateSyntheticOrderBook(symbol: string, currentPrice: number): void {
  if (currentPrice <= 0) return;

  const bids: { price: number; quantity: number }[] = [];
  const asks: { price: number; quantity: number }[] = [];

  // ✨ Paramètres de génération (ajustables)
  const LEVELS = 10;           // Nombre de niveaux de prix
  const SPREAD_PERCENT = 0.1;  // Écart bid-ask en %
  const MAX_QTY = 500;         // Quantité max par niveau

  const spreadAmount = currentPrice * (SPREAD_PERCENT / 100);
  const bestBid = currentPrice - spreadAmount;
  const bestAsk = currentPrice + spreadAmount;

  // 📗 BIDS (décroissants depuis bestBid)
  for (let i = 0; i < LEVELS; i++) {
    const tickSize = currentPrice < 100 ? 0.01 : 0.1;
    const price = bestBid - (i * tickSize);
    
    // Quantités décroissantes (plus on s'éloigne, moins de volume)
    const quantity = Math.floor(MAX_QTY * (1 - i * 0.08)) + Math.floor(Math.random() * 50);
    
    bids.push({ price: Math.max(0.01, price), quantity });
  }

  // 📕 ASKS (croissants depuis bestAsk)
  for (let i = 0; i < LEVELS; i++) {
    const tickSize = currentPrice < 100 ? 0.01 : 0.1;
    const price = bestAsk + (i * tickSize);
    
    const quantity = Math.floor(MAX_QTY * (1 - i * 0.08)) + Math.floor(Math.random() * 50);
    
    asks.push({ price, quantity });
  }

  // ✅ Mettre à jour le carnet
  this.depth = {
    bids,
    asks,
    lastPrice: currentPrice
  };
}

  // ==================== ✨ CONTRÔLES REPLAY AVEC RALENTI ====================
  
  replayPlay(): void {
    this.replayIsPlaying = true;

    this.replayService.play(this.sessionId).subscribe({
      next: () => console.log('▶️ Replay play'),
      error: (err) => {
        console.error('❌ Erreur play:', err);
        this.replayIsPlaying = false;
      }
    });
  }

  replayPause(): void {
    this.replayIsPlaying = false;

    this.replayService.pause(this.sessionId).subscribe({
      next: () => console.log('⏸️ Replay pause'),
      error: (err) => {
        console.error('❌ Erreur pause:', err);
        this.replayIsPlaying = true;
      }
    });
  }

  replayStop(): void {
    this.replayService.stop(this.sessionId).subscribe({
      next: () => console.log('⏹️ Replay stop'),
      error: (err) => console.error('❌ Erreur stop:', err)
    });
  }

  // ✨ NOUVEAU : Méthode améliorée pour gérer tous les types de vitesse
  replaySetSpeed(speed: number): void {
    // Validation locale
    if (speed <= 0 || speed > 10000) {
      console.warn('⚠️ Vitesse invalide:', speed);
      return;
    }

    // Afficher un message approprié selon le type de vitesse
    let speedLabel = '';
    if (speed < 1) {
      speedLabel = `🐌 Ralenti ×${speed}`;
    } else if (speed === 1) {
      speedLabel = '▶️ Vitesse normale';
    } else {
      speedLabel = `⚡ Accéléré ×${speed}`;
    }

    console.log(`🎬 Changement de vitesse demandé: ${speedLabel}`);
    console.log(`   Session ID: ${this.sessionId}`);
    console.log(`   Vitesse actuelle: ×${this.replayCurrentSpeed}`);
    console.log(`   Nouvelle vitesse: ×${speed}`);

    this.replayService.setSpeed(this.sessionId, speed).subscribe({
      next: (response) => {
        console.log(`✅ ${speedLabel} - Réponse serveur:`, response);
        
        // ✅ Mettre à jour l'état local immédiatement
        this.replayCurrentSpeed = speed;
        
        // Afficher un message dans l'interface
        if (speed < 1) {
          console.log(`⏱️ Les ticks arrivent maintenant ${1/speed}× plus lentement`);
        } else if (speed > 1) {
          console.log(`⚡ Les ticks arrivent maintenant ${speed}× plus vite`);
        }
      },
      error: (err) => {
        console.error('❌ Erreur changement vitesse:', err);
        console.error('   Détails:', err.error);
      }
    });
  }

  replayRewind(): void {
    this.replayService.rewind(this.sessionId, 10).subscribe({
      next: () => console.log('⏪ Rewind 10min'),
      error: (err) => console.error('❌ Erreur rewind:', err)
    });
  }

  replayForward(): void {
    this.replayService.forward(this.sessionId, 10).subscribe({
      next: () => console.log('⏩ Forward 10min'),
      error: (err) => console.error('❌ Erreur forward:', err)
    });
  }

  // ✨ NOUVEAU : Helper pour vérifier si c'est un ralenti
  isSlowMotion(): boolean {
    return this.replayCurrentSpeed < 1;
  }

  // ✨ NOUVEAU : Helper pour obtenir le label de vitesse
  getSpeedLabel(speed: number): string {
    if (speed < 1) {
      return `×${speed} 🐌`;
    } else if (speed === 1) {
      return '×1';
    } else {
      return `×${speed} ⚡`;
    }
  }

  // ==================== CARNET D'ORDRES ====================
 // ========================================
// MODIFIER selectSymbol() existant
// ========================================

selectSymbol(sym: string): void {
  this.selectedSymbol = sym;
  // 🔥 Appel IA immédiat
  this.fetchAISignal(sym);


  if (!this.isReplayMode) {
    this.marketDataService.trackSymbol(sym);
    this.loadOrderBook(); // ✅ REST API en mode Live
  } else {
    // ✨ NOUVEAU : Carnet synthétique en mode Replay
    const currentPrice = this.marketData[sym]?.price ?? 0;
    if (currentPrice > 0) {
      this.generateSyntheticOrderBook(sym, currentPrice);
    } else {
      // Prix pas encore reçu, on attend le prochain tick
      this.depth = { bids: [], asks: [], lastPrice: 0 };
    }
  }
  

  const currentPrice = this.marketData[sym]?.price ?? 0;
  if (this.orderType === OrderType.LIMIT) {
    this.orderPrice = currentPrice;
  }
}

  private loadOrderBook(): void {
    this.sessionOrderBookService
      .getDepth(this.sessionId, this.selectedSymbol, 10)
      .subscribe({
        next: (d) => { this.depth = d; },
        error: (e) => { console.warn('Erreur carnet:', e); }
      });
  }
  private getActiveSymbols(): string[] {
  // Pour l’instant on prend tous les symboles de la catégorie sélectionnée
  return this.symbols;
}
fetchAISignal(symbol: string) {
  this.aiLoading = true;
  this.aiSignal = null;
  this.aiConfidence = null;
  this.aiRecommendations = [];

  this.patternAI.analyze(symbol).subscribe({
    next: (res) => {
      this.aiSignal = res.signal;
      this.aiConfidence = res.confidence;
      this.aiRecommendations = res.recommendations ?? [];
      this.aiLoading = false;
    },
    error: () => {
      this.aiSignal = 'Erreur';
      this.aiLoading = false;
    }
  });
}
allocatePortfolio(): void {
  // 1️⃣ Vérifier qu'on a une session et des symboles
  if (!this.sessionId) {
    alert("Aucune session en cours.");
    return;
  }

  const symbols = this.getActiveSymbols();
  if (!symbols || symbols.length === 0) {
    alert("Aucun symbole disponible pour l'allocation.");
    return;
  }

  // 2️⃣ Construire la requête
  const request: AllocationRequest = {
    sessionId: this.sessionId,
    totalCapital: this.allocationCapital,
    symbols: symbols,
    strategy: this.allocationStrategy
  };

  // 3️⃣ Appel API
  this.isAllocating = true;

  this.portfolioService.allocate(request).subscribe({
    next: (res) => {
      console.log("✅ Allocation reçue :", res);
      this.allocationResult = res;
      this.isAllocating = false;
      // Ici plus tard on pourra appliquer l’allocation au portefeuille du joueur
    },
    error: (err) => {
      console.error("❌ Erreur allocation :", err);
      this.isAllocating = false;
      alert("Erreur lors du calcul d'allocation.");
    }
  });
}


  // ==================== ORDRES ====================
  onOrderTypeChange(): void {
    if (this.orderType === OrderType.LIMIT) {
      this.orderPrice = this.marketData[this.selectedSymbol]?.price ?? 100;
    } else {
      this.orderPrice = 0;
    }
  }

  canTrade(): boolean {
    return this.session?.status === SessionStatus.OPEN && this.isMarketOpen;
  }

  getEstimatedTotal(): number {
    const price = this.orderType === OrderType.MARKET
      ? (this.marketData[this.selectedSymbol]?.price ?? 0)
      : this.orderPrice;
    return this.orderQuantity * price;
  }

  placeOrder(): void {
    this.lastOrderError = '';

    if (!this.selectedSymbol) {
      this.lastOrderError = 'Sélectionnez un symbole';
      return;
    }
    if (!this.orderQuantity || this.orderQuantity <= 0) {
      this.lastOrderError = 'Quantité invalide';
      return;
    }
    if (this.orderType === OrderType.LIMIT && (!this.orderPrice || this.orderPrice <= 0)) {
      this.lastOrderError = 'Prix limite invalide';
      return;
    }

    if (this.orderSide === OrderSide.BUY && this.myParticipation) {
      const estimatedCost = this.getEstimatedTotal();
      if (estimatedCost > this.myParticipation.cashActuel) {
        this.lastOrderError = `Fonds insuffisants (disponible: ${this.myParticipation.cashActuel.toFixed(2)}€)`;
        return;
      }
    }

    this.isPlacingOrder = true;

    const price = this.orderType === OrderType.MARKET
      ? this.marketDataService.getCurrentPrice(this.selectedSymbol)
      : this.orderPrice;

    const order: SessionOrder = {
      sessionId: this.sessionId,
      userId: this.currentUser.id,
      symbol: this.selectedSymbol,
      type: this.orderType,
      side: this.orderSide,
      quantity: this.orderQuantity,
      price: price,
      status: OrderStatus.PENDING
    };

    this.sessionService.placeOrder(order).subscribe({
      next: (saved) => {
        this.isPlacingOrder = false;

        const executionPrice = saved?.executionPrice ?? price;
        this.activityFeed.unshift({
          text: `${this.orderSide === OrderSide.BUY ? '🟢 Achat' : '🔴 Vente'} ${order.quantity} ${order.symbol} @ ${executionPrice.toFixed(2)}€`,
          time: new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          type: this.orderSide === OrderSide.BUY ? 'buy' : 'sell'
        });
        this.activityFeed = this.activityFeed.slice(0, 20);

        this.loadParticipation();
        this.loadPositions();
        this.loadOrderBook();

        if (saved.status === OrderStatus.EXECUTED) {
          this.showSuccessMessage('✅ Ordre exécuté avec succès !');
        } else if (saved.status === OrderStatus.REJECTED) {
          this.lastOrderError = saved.rejectionReason ?? 'Ordre rejeté';
        } else {
          this.showSuccessMessage('⏳ Ordre placé (en attente d\'exécution)');
        }
      },
      error: (e) => {
        this.isPlacingOrder = false;
        console.error('Erreur placement ordre', e);
        this.lastOrderError = e.error?.error ?? 'Erreur lors du placement de l\'ordre';
      }
    });
  }

  private showSuccessMessage(msg: string): void {
    console.log(msg);
  }

  // ==================== HELPERS UI ====================
  getStatusColor(): string {
    if (!this.session) return 'gray';
    switch (this.session.status) {
      case SessionStatus.WAITING: return '#fbbf24';
      case SessionStatus.OPEN: return '#22c55e';
      case SessionStatus.PAUSED: return '#f97316';
      case SessionStatus.CLOSED: return '#64748b';
      default: return 'gray';
    }
  }

  getStatusLabel(): string {
    if (!this.session) return '';
    switch (this.session.status) {
      case SessionStatus.WAITING: return 'En attente';
      case SessionStatus.OPEN: return 'Ouverte';
      case SessionStatus.PAUSED: return 'Pause';
      case SessionStatus.CLOSED: return 'Fermée';
      default: return '';
    }
  }

  getPortfolioValue(): number {
    return this.myPositions.reduce((sum, p) => sum + p.marketValue, 0);
  }

  getPortfolioPnL(): number {
    return this.myPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  }

  getPortfolioPnLPercent(): number {
    const invested = this.myPositions.reduce((sum, p) => sum + p.avgPrice * p.quantity, 0);
    if (invested <= 0) return 0;
    return (this.getPortfolioPnL() / invested) * 100;
  }
  loadTraderAnalysis(): void {
  this.traderAnalysis.runAnalysis().subscribe({
    next: (res) => {
      console.log("📊 Analyse trader:", res);
      this.aiStrategies = res.strategies || [];
    },
    error: (err) => {
      console.error("❌ Erreur analyse trader:", err);
    }
  });
}

  
}
