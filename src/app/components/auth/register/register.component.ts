// src/app/components/auth/register/register.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  
  registerForm = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  acceptTerms = false;
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  onRegister(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Validations
    if (!this.registerForm.firstName || !this.registerForm.lastName || 
        !this.registerForm.email || !this.registerForm.password || 
        !this.registerForm.confirmPassword) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.registerForm.email)) {
      this.errorMessage = 'Format d\'email invalide';
      return;
    }

    if (this.registerForm.password.length < 6) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
      return;
    }

    if (this.registerForm.password !== this.registerForm.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return;
    }

    if (!this.acceptTerms) {
      this.errorMessage = 'Vous devez accepter les conditions d\'utilisation';
      return;
    }

    this.isLoading = true;

    // Préparer l'objet User pour le backend
    const user: User = {
      prenom: this.registerForm.firstName,
      nom: this.registerForm.lastName,
      email: this.registerForm.email,
      motDePasse: this.registerForm.password
    };

    // Appel API
    this.authService.register(user).subscribe({
      next: (response) => {
        console.log('Inscription réussie:', response);
        this.successMessage = 'Compte créé avec succès ! Redirection...';
        
        // Redirection vers login après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        console.error('Erreur d\'inscription:', error);
        // Gérer les différents types d'erreurs
        if (error.status === 409) {
          this.errorMessage = 'Cet email est déjà utilisé';
        } else if (error.error && typeof error.error === 'string') {
          this.errorMessage = error.error;
        } else {
          this.errorMessage = 'Une erreur est survenue lors de l\'inscription';
        }
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  getPasswordStrength(): string {
    const password = this.registerForm.password;
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    return 'strong';
  }
}