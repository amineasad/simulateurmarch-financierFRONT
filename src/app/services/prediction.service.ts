// src/app/services/prediction.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  // ⚠️ Flask tourne sur 5002 chez toi
  private apiUrl = 'http://localhost:5002/api/predict';

  constructor(private http: HttpClient) {}

  getPredictions(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
