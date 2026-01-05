// src/app/components/auth/login/login.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  
  loginForm = {
    email: '',
    password: ''
  };

  rememberMe = false;
  errorMessage = '';
  isLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  onLogin(): void {
    this.errorMessage = '';

    // Validations
    if (!this.loginForm.email || !this.loginForm.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.loginForm.email)) {
      this.errorMessage = 'Format d\'email invalide';
      return;
    }

    if (this.loginForm.password.length < 6) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
      return;
    }

    this.isLoading = true;

    // Appel API
    this.authService.login(this.loginForm.email, this.loginForm.password).subscribe({
      next: (user) => {
        console.log('Connexion réussie:', user);
        // Redirection vers la page de trading
        this.router.navigate(['/trading']);
      },
      error: (error) => {
        console.error('Erreur de connexion:', error);
        // Afficher le message d'erreur du backend
        if (typeof error.error === 'string') {
          this.errorMessage = error.error;
        } else {
          this.errorMessage = 'Email ou mot de passe incorrect';
        }
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}