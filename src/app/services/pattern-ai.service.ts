import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PatternAIService {

  private apiUrl = 'http://localhost:5000'; // ton Flask

  constructor(private http: HttpClient) {}

  analyze(symbol: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/patterns/analyze`, {
      symbol: symbol,
      period: '1y'
    });
  }
}
