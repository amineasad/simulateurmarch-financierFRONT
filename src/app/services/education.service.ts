import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EducationResource {
  id?: number;
  title: string;
  type: 'ARTICLE' | 'VIDEO';
  content?: string;
  url?: string;
  description?: string;
  createdAt?: string;

  // NEW
  difficulty?: 'EASY' | 'MID' | 'ADV'; // Beginner / Intermediate / Advanced
}


@Injectable({
  providedIn: 'root'
})
export class EducationService {
  private base = 'http://localhost:9090/examen/api/education';

  constructor(private http: HttpClient) {}

  list(): Observable<EducationResource[]> {
    return this.http.get<EducationResource[]>(this.base);
  }

  get(id: number): Observable<EducationResource> {
    return this.http.get<EducationResource>(`${this.base}/${id}`);
  }

  create(resource: EducationResource) {
    return this.http.post<EducationResource>(this.base, resource);
  }

  update(id: number, resource: EducationResource) {
    return this.http.put<EducationResource>(`${this.base}/${id}`, resource);
  }

  delete(id: number) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
