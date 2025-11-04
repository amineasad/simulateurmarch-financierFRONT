// src/app/components/gaming-room/gaming-room.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
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

interface StockData {
  price: number;
  change: number;
  changePercent: number;
}

@Component({
  selector: 'app-gaming-room',
  templateUrl: './gaming-room.component.html',
  styleUrls: ['./gaming-room.component.css']
})
export class GamingRoomComponent implements OnInit, OnDestroy {
  // ==== Enums exposés au template ====
  SessionStatus = SessionStatus;
  OrderSide = OrderSide;
  OrderType = OrderType;

  // ==== Session ====
  sessionId!: number;
  session: TradingSession | null = null;
  currentUser: any;
  myParticipation: SessionParticipation | null = null;

  // ==== Timer (simple pour commencer) ====
  timeRemaining = '--:--';
  sessionProgress = 0;
  isPaused = false;
  private timerSub?: Subscription;

  // ==== Marché ====
  symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
  marketData: Record<string, StockData> = {};
  private quotesSub?: Subscription;

  // ==== Trading (form) ====
  selectedSymbol = 'AAPL';
  orderType: OrderType = OrderType.MARKET;
  orderSide: OrderSide = OrderSide.BUY;
  orderQuantity = 10;
  orderPrice = 0;

  // ==== Feed simple ====
  activityFeed: Array<{text:string,time:string}> = [];

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private sessionService: TradingSessionService,
    private authService: AuthService,
    private marketDataService: MarketDataService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Route
    this.route.params.subscribe(params => {
      this.sessionId = +params['id'];
      this.loadSession();
    });

    // Prix live
    this.marketDataService.startPolling(this.symbols, 5000);
    this.quotesSub = this.marketDataService.streamQuotes().subscribe((map: Record<string, Quote>) => {
      for (const s of this.symbols) {
        const q = map[s];
        if (!q) continue;
        this.marketData[s] = {
          price: q.price,
          change: q.change,
          changePercent: q.changePercent
        };
      }
      // maintiens le prix dans le formulaire
      this.orderPrice = this.marketData[this.selectedSymbol]?.price || this.orderPrice;
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.quotesSub?.unsubscribe();
    this.marketDataService.stopPolling();
  }

  // ====== Session & Timer simple ======
  loadSession(): void {
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: (s) => {
        this.session = s;
        // participation
        this.sessionService.getParticipation(this.sessionId, this.currentUser.id)
          .subscribe({ next: p => this.myParticipation = p });

        // timer UI (1 Hz)
        this.timerSub = interval(1000).subscribe(() => this.updateTimer());
      },
      error: (e) => {
        console.error('Session load KO', e);
        this.router.navigate(['/lobby']);
      }
    });
  }

  private updateTimer(): void {
    if (!this.session) return;
    const now = new Date();
    const start = new Date(this.session.heureDebut);
    const end = new Date(this.session.heureFin);

    if (now < start) {
      this.timeRemaining = `Démarre dans ${this.formatTime(start.getTime() - now.getTime())}`;
      this.sessionProgress = 0;
    } else if (now > end) {
      this.timeRemaining = 'Terminée';
      this.sessionProgress = 100;
    } else {
      const remaining = end.getTime() - now.getTime();
      const total = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      this.timeRemaining = this.formatTime(remaining);
      this.sessionProgress = (elapsed / total) * 100;
    }
  }

  private formatTime(ms: number): string {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
    }

  // ====== Trading ======
  selectSymbol(sym: string): void {
    this.selectedSymbol = sym;
    this.marketDataService.trackSymbol(sym);
    this.orderPrice = this.marketData[sym]?.price || 0;
  }

  placeOrder(): void {
    if (!this.session || this.session.status !== SessionStatus.OPEN) {
      alert('Session non ouverte');
      return;
    }
    const last = this.marketData[this.selectedSymbol]?.price ?? 0;
    const order: SessionOrder = {
      sessionId: this.sessionId,
      userId: this.currentUser.id,
      symbol: this.selectedSymbol,
      type: this.orderType,
      side: this.orderSide,
      quantity: this.orderQuantity,
      price: this.orderType === OrderType.LIMIT ? this.orderPrice : last,
      status: OrderStatus.PENDING
    };
    // REST (sans WS pour l’instant)
    this.sessionService.placeOrder(order).subscribe({
      next: () => {
        this.activityFeed.unshift({
          text: `${this.orderSide === OrderSide.BUY ? 'Achat' : 'Vente'} ${order.quantity} ${order.symbol} @ ${order.price.toFixed(2)}`,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
        this.activityFeed = this.activityFeed.slice(0, 10);
      },
      error: (e) => {
        console.error('Order KO', e);
        alert('Erreur lors du passage d’ordre');
      }
    });
  }
}
