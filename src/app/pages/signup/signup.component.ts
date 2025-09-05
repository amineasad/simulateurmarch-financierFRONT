import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
signupObj = {
  firstName: '',
  lastName: '',
  email: '',
  motDePasse: ''
};


  constructor(private http: HttpClient, private router: Router) {}

  onSignup() {
    this.http.post('http://localhost:9090/examen/api/auth/register', this.signupObj)
      .subscribe({
        next: (res) => {
          console.log('Inscription réussie', res);
          alert('Compte créé avec succès ✅');
          this.router.navigate(['/login']); // Redirige vers login après succès
        },
        error: (err) => {
          console.error('Erreur inscription', err);
          alert('Erreur lors de l’inscription ❌');
        }
      });
  }
}
