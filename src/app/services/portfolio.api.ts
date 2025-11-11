import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PositionView {
  assetId: number;
  quantity: number;
  avgPrice: number;
  marketPrice?: number;
}

export interface PortfolioSnapshot {
  cash: number;
  reservedCash: number;
  positions: PositionView[];
  ts?: string;
}

@Injectable({ providedIn: 'root' })
export class PortfolioApi {
  private base = `${environment.API_BASE}/api/portfolio`;
  constructor(private http: HttpClient) {}

  // Récupère le portfolio de l'utilisateur courant
  getPortfolio(): Observable<PortfolioSnapshot> {
    return this.http.get<PortfolioSnapshot>(this.base);
  }
}


