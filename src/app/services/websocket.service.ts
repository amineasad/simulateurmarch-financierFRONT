// src/app/services/websocket.service.ts

import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private client: Client | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);

  private ensureClient() {
    if (this.client) return;
    this.client = new Client({
      brokerURL: undefined,
      webSocketFactory: () => new SockJS(`${environment.WS_BASE}/ws`),
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      reconnectDelay: 1000,
      debug: (msg) => console.log('[STOMP]', msg),
      onConnect: () => this.connected$.next(true),
      onStompError: (frame) => console.error('STOMP error', frame.headers, frame.body),
      onWebSocketClose: () => this.connected$.next(false),
    });
  }

  connect(): void {
    this.ensureClient();
    if (!this.client) return;
    if (this.client.active) return;
    this.client.activate();
  }

  disconnect(): void {
    if (!this.client) return;
    this.client.deactivate();
  }

  connection$(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  subscribe<T = any>(topic: string): Observable<T> {
    this.connect();
    const stream = new Subject<T>();
    const attempt = () => {
      if (!this.client) return;
      if (!this.client.connected) {
        const sub = this.connection$().subscribe((ok) => {
          if (ok) {
            sub.unsubscribe();
            attempt();
          }
        });
        return;
      }
      const subscription: StompSubscription = this.client.subscribe(topic, (msg: IMessage) => {
        try {
          const data = JSON.parse(msg.body);
          stream.next(data as T);
        } catch {
          // @ts-ignore
          stream.next(msg.body);
        }
      });
    };
    attempt();
    return stream.asObservable();
  }
}