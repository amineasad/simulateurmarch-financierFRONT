// src/app/services/wallet.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Wallet {
  id: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  stripePaymentId?: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  
  private apiUrl = 'http://localhost:9090/examen/api/wallet';

  constructor(private http: HttpClient) {}

  getWallet(userId: number): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.apiUrl}/${userId}`);
  }

  // NOUVEAU: Créer une session Stripe
  createCheckoutSession(userId: number, amount: number): Observable<{ sessionId: string, url: string }> {
    return this.http.post<{ sessionId: string, url: string }>(
      `${this.apiUrl}/create-checkout-session`,
      { userId, amount }
    );
  }

  deposit(userId: number, amount: number, stripePaymentId: string): Observable<WalletTransaction> {
    return this.http.post<WalletTransaction>(`${this.apiUrl}/deposit`, {
      userId,
      amount,
      stripePaymentId
    });
  }

  withdraw(userId: number, amount: number): Observable<WalletTransaction> {
    return this.http.post<WalletTransaction>(`${this.apiUrl}/withdraw`, {
      userId,
      amount
    });
  }

  getTransactions(userId: number): Observable<WalletTransaction[]> {
    return this.http.get<WalletTransaction[]>(`${this.apiUrl}/transactions/${userId}`);
  }
}