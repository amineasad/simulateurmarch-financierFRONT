import { Component } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  dark = false;

  toggleDark() {
    this.dark = !this.dark;
    document.body.classList.toggle('dark-mode', this.dark);
  }
}

