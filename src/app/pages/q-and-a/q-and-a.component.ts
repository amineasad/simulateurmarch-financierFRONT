import { Component } from '@angular/core';
import { QaService } from '../../services/qa.service';

@Component({
  selector: 'app-q-and-a',
  templateUrl: './q-and-a.component.html',
  styleUrls: ['./q-and-a.component.css']
})
export class QAndAComponent {
  userInput = '';
  
  messages: { from: 'user' | 'bot', text: string }[] = [];
  isLoading = false;

  constructor(private qaService: QaService) {}

  sendMessage() {
  if (!this.userInput.trim()) return;

  const question = this.userInput;
  this.messages.push({ from: 'user', text: question });

  this.isLoading = true;  // <-- démarrage du chargement

  this.qaService.addQuestion(question).subscribe({
    next: (response) => {
      console.log('Réponse backend brute:', response);

      const answer = response.reponse || "Désolé, pas de réponse disponible.";
      this.messages.push({ from: 'bot', text: answer });

      this.isLoading = false;  // <-- fin du chargement
    },
    error: (err) => {
      console.error('Erreur lors de l’ajout de la question :', err);
      this.messages.push({
        from: 'bot',
        text: '⚠️ Erreur lors de l’enregistrement de votre question.'
      });

      this.isLoading = false;  // <-- fin du chargement même en erreur
    }
  });

  this.userInput = ''; // reset input field
}

}
