import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

import { Client, IMessage, Stomp } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

export interface MarketTick {
  timestamp: string;
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ReplayStats {
  virtualTime: string;
  progress: number;
  currentTick: number;
  totalTicks: number;
  isPlaying: boolean;
  speedMultiplier: number;
}

@Injectable({ providedIn: 'root' })
export class MarketReplayService {

  private API_URL = 'http://localhost:9090/examen/api';
  private WS_URL = 'http://localhost:9090/examen/ws';

  private stompClient?: Client;

  private marketDataSubject = new Subject<MarketTick>();
  private replayStatsSubject = new Subject<ReplayStats>();

  constructor(private http: HttpClient) {}

  // ---------------------- WEBSOCKET ----------------------

  connectToSession(sessionId: number): void {
    const socket = new SockJS(this.WS_URL);

    this.stompClient = Stomp.over(() => socket);
    this.stompClient.debug = () => {};

    this.stompClient.onConnect = () => {
      console.log("✔ WebSocket replay connecté");

      this.stompClient!.subscribe(
        `/topic/session/${sessionId}/market-data`,
        (msg: IMessage) => {
          const tick = JSON.parse(msg.body);
          this.marketDataSubject.next(tick);
        }
      );

      this.stompClient!.subscribe(
        `/topic/session/${sessionId}/replay-stats`,
        (msg: IMessage) => {
          const stats = JSON.parse(msg.body);
          this.replayStatsSubject.next(stats);
        }
      );
    };

    this.stompClient.activate();
  }

  disconnect(): void {
    this.stompClient?.deactivate();
  }

  getMarketData(): Observable<MarketTick> {
    return this.marketDataSubject.asObservable();
  }

  getReplayStats(): Observable<ReplayStats> {
    return this.replayStatsSubject.asObservable();
  }

  // ---------------------- CONTROLS ----------------------

  play(id: number) { return this.http.post(`${this.API_URL}/replay/${id}/play`, {}); }
  pause(id: number) { return this.http.post(`${this.API_URL}/replay/${id}/pause`, {}); }
  stop(id: number) { return this.http.post(`${this.API_URL}/replay/${id}/stop`, {}); }

  setSpeed(id: number, speed: number) {
    return this.http.post(`${this.API_URL}/replay/${id}/speed`, { speedMultiplier: speed });
  }

  rewind(id: number, minutes: number) {
    return this.http.post(`${this.API_URL}/replay/${id}/rewind`, { minutes });
  }

  forward(id: number, minutes: number) {
    return this.http.post(`${this.API_URL}/replay/${id}/forward`, { minutes });
  }

  seekToDate(id: number, date: string) {
    return this.http.post(`${this.API_URL}/replay/${id}/seek`, { targetDate: date });
  }

  getState(id: number) {
    return this.http.get(`${this.API_URL}/replay/${id}/state`);
  }
}
