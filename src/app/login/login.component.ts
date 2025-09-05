import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  // Pour le dark mode
  isDarkMode = false;

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
  }

  // Objet pour stocker les données du formulaire
  loginObj = {
    EmailId: '',
    Password: ''
  };

  // Pour afficher/masquer le mot de passe
  passwordVisible = false;

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  constructor(private authService: AuthService, private router: Router) {}

  // Action du bouton Login
  onLogin() {
    console.log('Tentative de login avec :', this.loginObj);

    this.authService.login(this.loginObj.EmailId, this.loginObj.Password).subscribe({
      next: (response) => {
        console.log('Connexion réussie !', response);
        // Tu peux sauvegarder l'utilisateur dans le localStorage si besoin
        localStorage.setItem('user', JSON.stringify(response));
        this.router.navigate(['/accueil']); // Redirection vers la page d'accueil
      },
      error: (err) => {
        console.error('Erreur de connexion :', err);
        alert('Email ou mot de passe incorrect');
      }
    });
  }
}
