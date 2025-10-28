import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import * as SockJS from 'sockjs-client';
import { Client, Message, Stomp } from '@stomp/stompjs'; // ✅ Import correct navigateur

import { TradingSessionService } from '../../services/trading-session.service';
import { AuthService } from '../../services/auth.service';
import { 
  TradingSession, 
  SessionParticipation, 
  MarketEvent, 
  SessionOrder,
  SessionStatus,
  OrderSide,
  OrderStatus,
  OrderType,
  EventType,
  EventSeverity
} from '../../models/trading-session.model';

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
  // ===== Enums exposés pour le template =====
  SessionStatus = SessionStatus;
  OrderSide = OrderSide;
  OrderType = OrderType;
  EventType = EventType;
  EventSeverity = EventSeverity;

  // ===== Session et données =====
  sessionId!: number;
  session: TradingSession | null = null;
  currentUser: any;
  myParticipation: SessionParticipation | null = null;

  participants: SessionParticipation[] = [];
  leaderboard: SessionParticipation[] = [];
  onlineCount = 0;

  events: MarketEvent[] = [];
  activeEvents: MarketEvent[] = [];
  orders: SessionOrder[] = [];
  activityFeed: SessionOrder[] = [];

  // ===== WebSocket =====
  private stompClient?: Client;
  private isConnected = false;

  // ===== Timer =====
  timeRemaining = '--:--';
  sessionProgress = 0;
  isPaused = false;
  private timerSubscription?: Subscription;

  // ===== Trading =====
  selectedSymbol = 'AAPL';
  orderType: OrderType = OrderType.MARKET;
  orderSide: OrderSide = OrderSide.BUY;
  orderQuantity = 10;
  orderPrice = 0;

  // ===== Données marché simulées =====
  marketData: Record<string, StockData> = {
    AAPL: { price: 175.43, change: 2.35, changePercent: 1.36 },
    MSFT: { price: 378.85, change: -3.12, changePercent: -0.82 },
    GOOGL: { price: 139.75, change: 1.89, changePercent: 1.37 },
    AMZN: { price: 145.32, change: -2.45, changePercent: -1.66 },
    TSLA: { price: 238.45, change: 5.67, changePercent: 2.44 }
  };

  // ===== Chat =====
  chatMessages: Array<{user: string, message: string, time: string}> = [];
  newMessage = '';

  // ===== Admin =====
  isAdmin = false;
  showEventModal = false;
  newEvent: MarketEvent = {
    sessionId: 0,
    type: EventType.ANNONCE_ECONOMIQUE,
    severite: EventSeverity.MEDIUM,
    titre: '',
    description: '',
    declenchementPrevu: '',
    declenche: false,
    impacts: {}
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: TradingSessionService,
    private authService: AuthService
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
      this.connectWebSocket();
      this.startTimer();
    });
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
    this.disconnectWebSocket();
  }

  // ===== Chargement initial =====
  loadSession(): void {
    this.sessionService.getSessionById(this.sessionId).subscribe({
      next: (s) => {
        this.session = s;
        this.isAdmin = s.createurId === this.currentUser.id;
        this.loadParticipants();
        this.loadEvents();
        this.loadOrders();
      }
    });

    this.sessionService.getParticipation(this.sessionId, this.currentUser.id).subscribe({
      next: (p) => this.myParticipation = p
    });
  }

  loadParticipants(): void {
    this.sessionService.getParticipants(this.sessionId).subscribe(p => {
      this.participants = p;
      this.onlineCount = p.filter(x => x.connecte).length;
    });
    this.sessionService.getLeaderboard(this.sessionId).subscribe(l => this.leaderboard = l);
  }

  loadEvents(): void {
    this.sessionService.getSessionEvents(this.sessionId).subscribe(e => {
      this.events = e;
      this.activeEvents = e.filter(ev => !ev.declenche);
    });
  }

  loadOrders(): void {
    this.sessionService.getActivityFeed(this.sessionId).subscribe(a => this.activityFeed = a.slice(0,10));
    this.sessionService.getUserOrders(this.sessionId, this.currentUser.id).subscribe(o => this.orders = o);
  }

  // ===== WebSocket =====
  connectWebSocket(): void {
  const socket = new SockJS('http://localhost:9090/examen/ws-trading'); // endpoint backend
  this.stompClient = new Client({
    webSocketFactory: () => socket as any,
    reconnectDelay: 5000,
    debug: (str) => console.log('[STOMP]', str),
  });

  this.stompClient.onConnect = (frame) => {
    console.log('✅ STOMP Connected:', frame);
    // Subscribe to a topic
    this.stompClient?.subscribe('/topic/market', (message) => {
      console.log('Received message:', message.body);
    });
  };

  this.stompClient.onStompError = (frame) => {
    console.error('❌ STOMP Error:', frame);
  };

  this.stompClient.activate();
}

  subscribeToUpdates(): void {
    if (!this.stompClient) return;
    const topicBase = `/topic/session/${this.sessionId}`;
    this.stompClient.subscribe(`${topicBase}/updates`, msg => this.handleSessionUpdate(JSON.parse(msg.body)));
    this.stompClient.subscribe(`${topicBase}/market`, msg => this.handleMarketUpdate(JSON.parse(msg.body)));
    this.stompClient.subscribe(`${topicBase}/orders`, msg => this.handleOrderUpdate(JSON.parse(msg.body)));
    this.stompClient.subscribe(`${topicBase}/chat`, msg => this.chatMessages.push(JSON.parse(msg.body)));
    this.stompClient.subscribe(`${topicBase}/events`, msg => this.handleEventTrigger(JSON.parse(msg.body)));
    this.stompClient.subscribe(`${topicBase}/participants`, () => this.loadParticipants());
  }

  disconnectWebSocket(): void {
    if (this.stompClient && this.isConnected) {
      this.sendConnectionStatus(false);
      this.stompClient.deactivate();
      this.isConnected = false;
    }
  }

  sendConnectionStatus(connected: boolean): void {
    if (this.stompClient && this.isConnected) {
      this.stompClient.publish({
        destination: `/app/session/${this.sessionId}/connection`,
        body: JSON.stringify({ userId: this.currentUser.id, connected })
      });
    }
  }

  // ===== Handlers WebSocket =====
  handleSessionUpdate(update: any): void {
    if (update.status && this.session) {
      this.session.status = update.status;
      this.isPaused = update.status === SessionStatus.PAUSED;
    }
  }

  handleMarketUpdate(update: any): void {
    if (update.symbol && update.price) {
      this.marketData[update.symbol] = {
        price: update.price,
        change: update.change || 0,
        changePercent: update.changePercent || 0
      };
    }
  }

  handleOrderUpdate(order: SessionOrder): void {
    this.activityFeed.unshift(order);
    this.activityFeed = this.activityFeed.slice(0,10);
    this.loadParticipants();
  }

  handleEventTrigger(event: MarketEvent): void {
    this.showEventAlert(event);
    if (event.impacts) {
      Object.keys(event.impacts).forEach(symbol => {
        const impact = event.impacts![symbol];
        const current = this.marketData[symbol];
        if (current) {
          current.price *= (1 + impact);
          current.change = current.price * impact;
          current.changePercent = impact * 100;
        }
      });
    }
  }

  // ===== Timer =====
  startTimer(): void {
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.session && !this.isPaused) this.updateTimer();
    });
  }

  updateTimer(): void {
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
      this.sessionProgress = (elapsed/total)*100;
    }
  }

  formatTime(ms: number): string {
    const minutes = Math.floor(ms/60000);
    const seconds = Math.floor((ms%60000)/1000);
    return `${minutes}:${seconds.toString().padStart(2,'0')}`;
  }

  // ===== Trading =====
  placeOrder(): void {
    if (!this.session || this.session.status !== SessionStatus.OPEN) { alert('Session non ouverte'); return; }

    const order: SessionOrder = {
      sessionId: this.sessionId,
      userId: this.currentUser.id,
      symbol: this.selectedSymbol,
      type: this.orderType,
      side: this.orderSide,
      quantity: this.orderQuantity,
      price: this.orderType===OrderType.LIMIT ? this.orderPrice : this.marketData[this.selectedSymbol].price,
      status: OrderStatus.PENDING
    };

    if (this.stompClient && this.isConnected) {
      this.stompClient.publish({
        destination: `/app/session/${this.sessionId}/order`,
        body: JSON.stringify(order)
      });
    } else {
      this.sessionService.placeOrder(order).subscribe({
        next: r => console.log('Ordre placé', r),
        error: e => alert('Erreur ordre')
      });
    }
  }

  selectSymbol(symbol: string): void {
    this.selectedSymbol = symbol;
    this.orderPrice = this.marketData[symbol]?.price || 0;
  }

  // ===== Chat =====
  sendChatMessage(): void {
    if (!this.newMessage.trim()) return;
    const msg = { user: this.currentUser.nom, message: this.newMessage, time: new Date().toLocaleTimeString() };
    if (this.stompClient && this.isConnected) {
      this.stompClient.publish({
        destination: `/app/session/${this.sessionId}/chat`,
        body: JSON.stringify(msg)
      });
    }
    this.newMessage = '';
  }

  // ===== Admin =====
  startSession(): void { if (!this.isAdmin) return; this.sessionService.startSession(this.sessionId).subscribe(s => this.session = s); }
  pauseSession(): void { if (!this.isAdmin) return; this.sessionService.pauseSession(this.sessionId).subscribe(s => { this.session = s; this.isPaused = true; }); }
  resumeSession(): void { if (!this.isAdmin) return; this.sessionService.resumeSession(this.sessionId).subscribe(s => { this.session = s; this.isPaused = false; }); }
  closeSession(): void { if (!this.isAdmin) return; if(confirm('Terminer la session ?')) this.sessionService.closeSession(this.sessionId).subscribe(()=> this.router.navigate(['/lobby'])); }

  triggerEvent(): void {
    if (!this.isAdmin) return;
    this.newEvent.sessionId = this.sessionId;
    this.newEvent.declenchementPrevu = new Date().toISOString();
    this.sessionService.createEvent(this.newEvent).subscribe(e => {
      this.sessionService.triggerEvent(e.id!).subscribe(()=> this.showEventModal = false);
    });
  }

  showEventAlert(event: MarketEvent): void {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'event-alert';
    alertDiv.innerHTML = `<div class="event-alert-content"><h3>⚠️ ${event.titre}</h3><p>${event.description}</p></div>`;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 10000);
  }

  // ===== Navigation =====
  leaveSession(): void { if(confirm('Quitter la session ?')) { this.disconnectWebSocket(); this.router.navigate(['/lobby']); } }
  goToLobby(): void { this.router.navigate(['/lobby']); }
}
