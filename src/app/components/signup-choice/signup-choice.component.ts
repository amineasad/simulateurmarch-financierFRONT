// src/app/components/signup-choice/signup-choice.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup-choice',
  templateUrl: './signup-choice.component.html',
  styleUrls: ['./signup-choice.component.css']
})
export class SignupChoiceComponent {

  constructor(private router: Router) {}

  selectProfile(type: string): void {
    switch(type) {
      case 'student':
        this.router.navigate(['/signup/student']);
        break;
      case 'company':
        this.router.navigate(['/signup/company']);
        break;
      case 'individual':
        this.router.navigate(['/signup/individual']);
        break;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}