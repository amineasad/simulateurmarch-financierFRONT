import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account-opening-intro',
  templateUrl: './account-opening-intro.component.html',
  styleUrls: ['./account-opening-intro.component.css']
})
export class AccountOpeningIntroComponent {
  constructor(private router: Router) {}

  goToSignupChoice(): void {
    this.router.navigate(['/signup-choice']);
  }
}
