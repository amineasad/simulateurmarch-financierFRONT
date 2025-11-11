import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateOrderDto {
  assetId: number;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: number;
  price?: number;
}

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private base = `${environment.API_BASE}/api/orders`;
  constructor(private http: HttpClient) {}

  createOrder(dto: CreateOrderDto): Observable<any> {
    return this.http.post(this.base, dto);
  }

  cancelOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Récupère le snapshot courant du carnet d'ordres pour un actif
  getOrderBookSnapshot(assetId: number): Observable<any> {
    return this.http.get<any>(`${this.base}/orderbook/${assetId}`);
  }
}

