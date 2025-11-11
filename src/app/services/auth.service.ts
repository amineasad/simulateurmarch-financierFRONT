// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ✅ Interface User modifiée avec tous les nouveaux champs
export interface User {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  motDePasse?: string;
  
  // ✅ NOUVEAU : Type de profil
  profileType: 'STUDENT' | 'COMPANY' | 'INDIVIDUAL';
  
  // ✅ NOUVEAU : Champs communs
  cin?: string;
  photoVisage?: string; // Base64
  
  // ✅ NOUVEAU : Champs ÉTUDIANT
  carteEtudiant?: string;
  photoFace?: string; // Base64
  photoProfil?: string; // Base64
  
  // ✅ NOUVEAU : Champs ENTREPRISE
  nomEntreprise?: string;
  matriculeFiscale?: string;
  adresseEntreprise?: string;
  secteurActivite?: string;
  numeroRegistreCommerce?: string;
  documentLegal?: string;
  
  createdAt?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private apiUrl = `${environment.API_BASE}/api/auth`;
  
  constructor(private http: HttpClient) {}
  
  // Inscription
  register(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, user);
  }
  
  // Connexion
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        // Supporter à la fois {token} et {user, token}
        if (res?.token) {
          localStorage.setItem('authToken', res.token);
        }
        if (res?.user) {
          localStorage.setItem('currentUser', JSON.stringify(res.user));
        } else {
          localStorage.setItem('currentUser', JSON.stringify(res));
        }
      })
    );
  }
  
  // Déconnexion
  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
  }
  
  // Vérifier si l'utilisateur est connecté
  isLoggedIn(): boolean {
    return localStorage.getItem('currentUser') !== null;
  }
  
  // Récupérer l'utilisateur actuel
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Token
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // Décoder le userId depuis le JWT si présent
  getUserId(): number | null {
    const user = this.getCurrentUser();
    if (user?.id) return Number(user.id);
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const id = payload['sub'] || payload['userId'] || payload['id'];
      return id ? Number(id) : null;
    } catch {
      return null;
    }
  }
}