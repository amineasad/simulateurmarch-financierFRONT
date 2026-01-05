import { Component } from '@angular/core';
import { ReclamationService } from '../../services/reclamation.service';

@Component({
  selector: 'app-reclamation',
  templateUrl: './reclamation.component.html',
  styleUrls: ['./reclamation.component.css']
})
export class ReclamationComponent {

  texte: string = '';
  resultat: any | null = null;
  loading = false;
  error: string | null = null;


  constructor(private reclamationService: ReclamationService) {}

  envoyer() {
    this.loading = true;
    this.resultat = null;
    this.error = null;

    this.reclamationService.analyserReclamation(this.texte)
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.resultat = res;
        },
        error: (err) => {
          this.loading = false;
          this.error = "Erreur d'analyse";
        }
      });
  }
}
