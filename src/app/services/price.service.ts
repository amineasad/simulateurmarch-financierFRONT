import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PriceService {
  private apiKey = '8K53JG89HP69V8QP'; // Clé API valide
  private apiUrl = 'https://www.alphavantage.co/query'; // URL de base corrigée

  constructor(private http: HttpClient) {
    console.log('PriceService initialisé'); // Pour vérifier que le service est chargé
  }

  /**
   * Récupère les prix d'une action en temps réel (intervalle de 1 minute)
   * @param symbol Symbole de l'action (ex. MSFT pour Microsoft)
   * @returns Observable contenant les données de prix
   */
  getStockPrice(symbol: string): Observable<any> {
    return this.http.get(`${this.apiUrl}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=1min&apikey=${this.apiKey}`);
  }

  /**
   * Récupère le taux de change entre deux devises
   * @param fromCurrency Devise source (ex. EUR)
   * @param toCurrency Devise cible (ex. USD)
   * @returns Observable contenant le taux de change
   */
  getForexRate(fromCurrency: string, toCurrency: string): Observable<any> {
    return this.http.get(`${this.apiUrl}?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${this.apiKey}`);
  }
}