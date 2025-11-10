// src/app/services/session-order-book.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SessionOrderBookDepth } from '../models/market.model';

@Injectable({ providedIn: 'root' })
export class SessionOrderBookService {
  private readonly BASE = 'http://localhost:9090/examen/api/orderbook';

  constructor(private http: HttpClient) {}

  getDepth(sessionId: number, symbol: string, levels = 10): Observable<SessionOrderBookDepth> {
    return this.http.get<any>(`${this.BASE}/${sessionId}/${symbol}/depth`, {
      params: { levels: levels.toString() }
    }).pipe(
      map(r => ({
        bids: (r?.bids ?? []).map((x: any) => ({ 
          price: x.price ?? 0, 
          quantity: x.quantity ?? 0 
        })),
        asks: (r?.asks ?? []).map((x: any) => ({ 
          price: x.price ?? 0, 
          quantity: x.quantity ?? 0 
        })),
        lastPrice: r?.lastPrice ?? 0
      })),
      catchError(() => {
        console.warn('Erreur récupération carnet, retour vide');
        return [{ bids: [], asks: [], lastPrice: 0 }];
      })
    );
  }

  getActiveSymbols(sessionId: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.BASE}/${sessionId}/symbols`).pipe(
      catchError(() => [])
    );
  }
}