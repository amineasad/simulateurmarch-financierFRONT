import { Component } from '@angular/core';
import { ReclamationService } from '../../services/reclamation.service';

@Component({
  selector: 'app-reclamation-chat',
  templateUrl: './reclamation-chat.component.html',
  styleUrls: ['./reclamation-chat.component.css']
})
export class ReclamationChatComponent {

  isOpen = false;
  message: string = "";
  loading = false;
  response: any = null;

  constructor(private reclamationService: ReclamationService) {}

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) this.response = null;
  }

  envoyer() {
    if (!this.message.trim()) return;

    this.loading = true;
    this.response = null;

    this.reclamationService.analyserReclamation(this.message)
      .subscribe({
        next: (res: any) => {
          this.response = res;
          this.loading = false;
        },
        error: () => {
          this.response = { reponse: "❌ Serveur indisponible" };
          this.loading = false;
        }
      });

    this.message = "";
  }
}
