import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TraderAnalysisService {
  private apiUrl = 'http://localhost:9090/examen/api/trader-analysis/run';

  constructor(private http: HttpClient) {}

  runAnalysis(): Observable<any> {
    return this.http.post<any>(this.apiUrl, {});
  }
}
