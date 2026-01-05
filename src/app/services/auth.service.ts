// src/app/services/auth.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

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
  
  private apiUrl = 'http://localhost:9090/examen/api/auth'; // ✅ CORRIGÉ : /examen retiré
  
  constructor(private http: HttpClient) {}
  
  // Inscription
  register(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/register`, user);
  }
  
  // Connexion
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(user => {
        // Stocker l'utilisateur dans localStorage
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  }
  
  // Déconnexion
  logout(): void {
    localStorage.removeItem('currentUser');
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
}