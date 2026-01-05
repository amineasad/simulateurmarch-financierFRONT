import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReclamationService {

  private baseUrl = 'http://localhost:9090/examen/api/reclamations';

  constructor(private http: HttpClient) {}

  analyserReclamation(texte: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/analyser`, { texte });
  }
}
