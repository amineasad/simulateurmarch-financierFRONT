import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AllocationRequest, AllocationResult } from '../models/allocation.models';

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {

  private API_URL = 'http://localhost:9090/examen/api/portfolio';

  constructor(private http: HttpClient) {}

  allocate(request: AllocationRequest): Observable<AllocationResult> {
    return this.http.post<AllocationResult>(`${this.API_URL}/allocate`, request);
  }
}
