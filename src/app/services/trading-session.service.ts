// src/app/services/trading-session.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TradingSession, SessionParticipation, MarketEvent, SessionOrder } from '../models/trading-session.model';

// ✅ NOUVEAUX TYPES pour le Time Scaling
export interface VirtualClockResponse {
  virtualTime: string;           // "10:45:30"
  phase: string;                 // "OPENING"
  phaseDescription: string;      // "Ouverture (volatilité haute)"
  isMarketOpen: boolean;
  progressPercentage: number;    // 0.32 (32%)
  realMinutesRemaining: number;  // 45 minutes réelles
  timeScaleFactor: number;       // 6.5
}

export interface TimeScaleStats {
  virtualMarketTime: string;
  tradingPhase: string;
  progressPercentage: number;
  realMinutesElapsed: number;
  realMinutesRemaining: number;
  timeScaleFactor: number;
  isMarketOpen: boolean;
  formattedProgress?: string;
  virtualTimeFormatted?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TradingSessionService {
  private readonly API_URL = 'http://localhost:9090/examen/api';

  constructor(private http: HttpClient) {}

  // ==================== SESSIONS ====================
  
  createSession(session: TradingSession): Observable<TradingSession> {
    return this.http.post<TradingSession>(`${this.API_URL}/sessions`, session);
  }

  getAllSessions(): Observable<TradingSession[]> {
    return this.http.get<TradingSession[]>(`${this.API_URL}/sessions`);
  }

  getActiveSessions(): Observable<TradingSession[]> {
    return this.http.get<TradingSession[]>(`${this.API_URL}/sessions/active`);
  }

  getSessionById(id: number): Observable<TradingSession> {
    return this.http.get<TradingSession>(`${this.API_URL}/sessions/${id}`);
  }

  getSessionByCode(code: string): Observable<TradingSession> {
    return this.http.get<TradingSession>(`${this.API_URL}/sessions/code/${code}`);
  }

  getSessionsByCreator(creatorId: number): Observable<TradingSession[]> {
    return this.http.get<TradingSession[]>(`${this.API_URL}/sessions/creator/${creatorId}`);
  }

  startSession(id: number): Observable<TradingSession> {
    return this.http.post<TradingSession>(`${this.API_URL}/sessions/${id}/start`, {});
  }

  pauseSession(id: number): Observable<TradingSession> {
    return this.http.post<TradingSession>(`${this.API_URL}/sessions/${id}/pause`, {});
  }

  resumeSession(id: number): Observable<TradingSession> {
    return this.http.post<TradingSession>(`${this.API_URL}/sessions/${id}/resume`, {});
  }

  closeSession(id: number): Observable<TradingSession> {
    return this.http.post<TradingSession>(`${this.API_URL}/sessions/${id}/close`, {});
  }

  updateSession(id: number, session: TradingSession): Observable<TradingSession> {
    return this.http.put<TradingSession>(`${this.API_URL}/sessions/${id}`, session);
  }

  deleteSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/sessions/${id}`);
  }

  countParticipants(id: number): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/sessions/${id}/participants/count`);
  }

  isSessionFull(id: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.API_URL}/sessions/${id}/is-full`);
  }

  // ==================== PARTICIPATIONS ====================

  joinSession(sessionId: number, userId: number): Observable<SessionParticipation> {
    return this.http.post<SessionParticipation>(`${this.API_URL}/participations/join`, {
      sessionId,
      userId
    });
  }

  joinSessionByCode(codeAcces: string, userId: number): Observable<SessionParticipation> {
    return this.http.post<SessionParticipation>(`${this.API_URL}/participations/join-by-code`, {
      codeAcces,
      userId: userId.toString()
    });
  }

  connectToSession(sessionId: number, userId: number): Observable<SessionParticipation> {
    return this.http.post<SessionParticipation>(`${this.API_URL}/participations/connect`, {
      sessionId,
      userId
    });
  }

  disconnectFromSession(sessionId: number, userId: number): Observable<SessionParticipation> {
    return this.http.post<SessionParticipation>(`${this.API_URL}/participations/disconnect`, {
      sessionId,
      userId
    });
  }

  getParticipants(sessionId: number): Observable<SessionParticipation[]> {
    return this.http.get<SessionParticipation[]>(`${this.API_URL}/participations/session/${sessionId}`);
  }

  getLeaderboard(sessionId: number): Observable<SessionParticipation[]> {
    return this.http.get<SessionParticipation[]>(`${this.API_URL}/participations/session/${sessionId}/leaderboard`);
  }

  getParticipation(sessionId: number, userId: number): Observable<SessionParticipation> {
    return this.http.get<SessionParticipation>(`${this.API_URL}/participations/session/${sessionId}/user/${userId}`);
  }

  countActiveParticipants(sessionId: number): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/participations/session/${sessionId}/active-count`);
  }

  // ==================== ÉVÉNEMENTS ====================

  createEvent(event: any): Observable<MarketEvent> {
    return this.http.post<MarketEvent>(`${this.API_URL}/events`, event);
  }

  getSessionEvents(sessionId: number): Observable<MarketEvent[]> {
    return this.http.get<MarketEvent[]>(`${this.API_URL}/events/session/${sessionId}`);
  }

  triggerEvent(eventId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/events/${eventId}/trigger`, {});
  }

  checkScheduledEvents(sessionId: number): Observable<MarketEvent[]> {
    return this.http.post<MarketEvent[]>(`${this.API_URL}/events/session/${sessionId}/check-scheduled`, {});
  }

  // ==================== ORDRES ====================

  placeOrder(order: SessionOrder): Observable<SessionOrder> {
    return this.http.post<SessionOrder>(`${this.API_URL}/orders`, order);
  }

  executeOrder(orderId: number): Observable<SessionOrder> {
    return this.http.post<SessionOrder>(`${this.API_URL}/orders/${orderId}/execute`, {});
  }

  cancelOrder(orderId: number): Observable<SessionOrder> {
    return this.http.post<SessionOrder>(`${this.API_URL}/orders/${orderId}/cancel`, {});
  }

  getSessionOrders(sessionId: number): Observable<SessionOrder[]> {
    return this.http.get<SessionOrder[]>(`${this.API_URL}/orders/session/${sessionId}`);
  }

  getUserOrders(sessionId: number, userId: number): Observable<SessionOrder[]> {
    return this.http.get<SessionOrder[]>(`${this.API_URL}/orders/session/${sessionId}/user/${userId}`);
  }

  getActivityFeed(sessionId: number): Observable<SessionOrder[]> {
    return this.http.get<SessionOrder[]>(`${this.API_URL}/orders/session/${sessionId}/activity`);
  }

  getTotalVolume(sessionId: number): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/orders/session/${sessionId}/volume`);
  }

  getPositions(sessionId: number, userId: number) {
    return this.http.get<any[]>(`${this.API_URL}/positions/session/${sessionId}/user/${userId}`);
  }

  // ==================== ✅ TIME SCALING (NOUVEAUX ENDPOINTS) ====================

  /**
   * Récupère l'horloge virtuelle de la session
   */
  getVirtualClock(sessionId: number): Observable<VirtualClockResponse> {
    return this.http.get<VirtualClockResponse>(
      `${this.API_URL}/sessions/${sessionId}/time/virtual-clock`
    );
  }

  /**
   * Récupère les statistiques complètes du time scaling
   */
  getTimeStats(sessionId: number): Observable<TimeScaleStats> {
    return this.http.get<TimeScaleStats>(
      `${this.API_URL}/sessions/${sessionId}/time/stats`
    );
  }
}