// src/app/components/gaming-room/gaming-room.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval, timer, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TradingSessionService } from '../../services/trading-session.service';
import { AuthService } from '../../services/auth.service';
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
  // Enums
  SessionStatus = SessionStatus;
  OrderSide = OrderSide;
  OrderType = OrderType;

  // Session
  sessionId!: number;
  session: TradingSession | null = null;
  currentUser: any;
  myParticipation: SessionParticipation | null = null;

  // Timer
  timeRemaining = '--:--';
  sessionProgress = 0;
  private timerSub?: Subscription;

  // Marché
  symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
  marketData: Record<string, StockData> = {};
  private quotesSub?: Subscription;

  // Trading
  selectedSymbol = 'AAPL';
  orderType: OrderType = OrderType.MARKET;
  orderSide: OrderSide = OrderSide.BUY;
  orderQuantity = 10;
  orderPrice = 0;

  // Feed d'activité
  activityFeed: ActivityItem[] = [];

  // Carnet d'ordres
  depth?: SessionOrderBookDepth;
  private depthStop$ = new Subject<void>();

  // Mapping vers TradingView
  private symbolMap: Record<string, string> = {
    'AAPL': 'NASDAQ:AAPL',
    'MSFT': 'NASDAQ:MSFT',
    'GOOGL': 'NASDAQ:GOOGL',
    'AMZN': 'NASDAQ:AMZN',
    'TSLA': 'NASDAQ:TSLA',
    'META': 'NASDAQ:META',
    'NVDA': 'NASDAQ:NVDA',
    'NFLX': 'NASDAQ:NFLX'
  };
  get tradingViewSymbol(): string {
    return this.symbolMap[this.selectedSymbol] || 'NASDAQ:AAPL';
  }

  // Loading states
  isPlacingOrder = false;
  lastOrderError = '';

  // Positions (portfolio)
  myPositions: PositionRow[] = [];
  trackBySymbol = (_: number, p: PositionRow) => p.symbol;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private sessionService: TradingSessionService,
    private authService: AuthService,
    private marketDataService: MarketDataService,
    private sessionOrderBookService: SessionOrderBookService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.route.params.subscribe(params => {
      this.sessionId = +params['id'];
      this.loadSession();
    });

    // Prix simulés
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

        // Mettre à jour le prix du formulaire pour LIMIT
        if (this.orderType === OrderType.LIMIT) {
          const currentPrice = this.marketData[this.selectedSymbol]?.price;
          if (currentPrice && this.orderPrice === 0) {
            this.orderPrice = currentPrice;
          }
        }

        // ✅ Recalcule live des PnL/valeurs des positions à chaque tick
        this.recomputePositionsFromQuotes();
      }
    );
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.quotesSub?.unsubscribe();
    this.marketDataService.stopPolling();
    this.depthStop$.next();
    this.depthStop$.complete();
  }

  // ====== Session ======
  loadSession(): void {
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: (s) => {
        this.session = s;
        this.loadParticipation();
        this.loadPositions();
        this.startTimer();
        this.startDepthPolling();
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
        next: (p) => {
          this.myParticipation = p;
        },
        error: (e) => {
          console.error('Erreur chargement participation', e);
        }
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
    return { symbol, quantity, avgPrice, lastPrice: last, marketValue: value, unrealizedPnL: pnl, unrealizedPnLPercent: pnlPct };
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

  // ====== Timer ======
  private startTimer(): void {
    this.timerSub = interval(1000).subscribe(() => this.updateTimer());
  }

  private updateTimer(): void {
    if (!this.session) return;

    const now = new Date();
    const start = new Date(this.session.heureDebut);
    const end = new Date(this.session.heureFin);

    if (now < start) {
      const ms = start.getTime() - now.getTime();
      this.timeRemaining = `Démarre dans ${this.formatTime(ms)}`;
      this.sessionProgress = 0;
    } else if (now > end) {
      this.timeRemaining = 'Terminée';
      this.sessionProgress = 100;
    } else {
      const remaining = end.getTime() - now.getTime();
      const total = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      this.timeRemaining = this.formatTime(remaining);
      this.sessionProgress = Math.min(100, (elapsed / total) * 100);
    }
  }

  private formatTime(ms: number): string {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ====== Carnet d'ordres ======
  private startDepthPolling(): void {
    this.depthStop$.next();
    if (!this.session) return;

    timer(0, 1500)
      .pipe(takeUntil(this.depthStop$))
      .subscribe(() => {
        this.sessionOrderBookService
          .getDepth(this.sessionId, this.selectedSymbol, 10)
          .subscribe({
            next: (d) => { this.depth = d; },
            error: (e) => { console.warn('Erreur carnet:', e); }
          });
      });
  }

  // ====== Trading ======
  selectSymbol(sym: string): void {
    this.selectedSymbol = sym;
    this.marketDataService.trackSymbol(sym);

    const currentPrice = this.marketData[sym]?.price ?? 0;
    if (this.orderType === OrderType.LIMIT) {
      this.orderPrice = currentPrice;
    }

    this.startDepthPolling();
  }

  onOrderTypeChange(): void {
    if (this.orderType === OrderType.LIMIT) {
      this.orderPrice = this.marketData[this.selectedSymbol]?.price ?? 100;
    } else {
      this.orderPrice = 0;
    }
  }

  canTrade(): boolean {
    return true;
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
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: this.orderSide === OrderSide.BUY ? 'buy' : 'sell'
        });
        this.activityFeed = this.activityFeed.slice(0, 20);

        // Rafraîchir cash & positions
        this.loadParticipation();
        this.loadPositions();

        // Rafraîchir immédiatement le carnet
        this.sessionOrderBookService
          .getDepth(this.sessionId, this.selectedSymbol, 10)
          .subscribe({ next: (d) => { this.depth = d; } });

        // Message
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

  // Helpers pour le template
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

  // Portfolio totals
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
}
