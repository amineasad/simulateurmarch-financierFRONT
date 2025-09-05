import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QaService {
  private apiUrl = 'http://localhost:9090/examen/api/qa';

  constructor(private http: HttpClient) {}

  addQuestion(contenu: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/ask`, { contenu });
  }
}
