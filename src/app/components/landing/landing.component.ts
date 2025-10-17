// src/app/components/landing/landing.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent {

  constructor(private router: Router) {}

  goToSignupChoice(): void {
    this.router.navigate(['/signup-choice']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}