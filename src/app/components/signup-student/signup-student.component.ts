// src/app/components/signup-student/signup-student.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-signup-student',
  templateUrl: './signup-student.component.html',
  styleUrls: ['./signup-student.component.css']
})
export class SignupStudentComponent {

  user: User = {
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    profileType: 'STUDENT',
    cin: '',
    carteEtudiant: '',
    photoVisage: '',
    photoFace: '',
    photoProfil: ''
  };

  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  previewPhotoVisage: string | null = null;
  previewPhotoFace: string | null = null;
  previewPhotoProfil: string | null = null;

  currentStep: number = 1;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Upload des photos
  onPhotoChange(event: any, field: 'photoVisage' | 'photoFace' | 'photoProfil'): void {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Veuillez sélectionner une image valide';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'L\'image ne doit pas dépasser 5MB';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.user[field] = base64;

      if (field === 'photoVisage') this.previewPhotoVisage = base64;
      if (field === 'photoFace') this.previewPhotoFace = base64;
      if (field === 'photoProfil') this.previewPhotoProfil = base64;
    };
    reader.readAsDataURL(file);
  }

  // Validation par étape
  private validateForm(): boolean {
    this.errorMessage = '';

    if (this.currentStep === 1) {
      if (!this.user.nom || !this.user.prenom || !this.user.email || !this.user.motDePasse) {
        this.errorMessage = 'Veuillez remplir tous les champs obligatoires';
        return false;
      }
      if (this.user.motDePasse !== this.confirmPassword) {
        this.errorMessage = 'Les mots de passe ne correspondent pas';
        return false;
      }
      if (this.user.motDePasse.length < 6) {
        this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
        return false;
      }
    }

    if (this.currentStep === 2) {
      if (!this.user.cin) {
        this.errorMessage = 'Le CIN est obligatoire';
        return false;
      }
      if (!this.user.carteEtudiant) {
        this.errorMessage = 'Le numéro de carte d\'étudiant est obligatoire';
        return false;
      }
      if (!this.user.photoVisage || !this.user.photoFace || !this.user.photoProfil) {
        this.errorMessage = 'Toutes les photos sont obligatoires';
        return false;
      }
    }

    return true;
  }

  // Passer à l'étape suivante
  nextStep(): void {
    if (!this.validateForm()) return;

    if (this.currentStep < 3) {
      this.currentStep++;
    } else {
      this.submitForm();
    }
  }

  // Soumettre le formulaire
  private submitForm(): void {
    this.isLoading = true;
    this.authService.register(this.user).subscribe({
      next: () => {
        this.successMessage = 'Inscription réussie ! Redirection...';
        this.isLoading = false;
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (error) => {
        this.errorMessage = error.error || 'Une erreur est survenue lors de l\'inscription';
        this.isLoading = false;
      }
    });
  }

  // Retour en arrière
  goBack(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      this.router.navigate(['/signup-choice']);
    }
  }
}
