// src/app/components/signup-student/signup-student.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service'; // ✅ Import corrigé


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
  
  // Preview des images
  previewPhotoVisage: string | null = null;
  previewPhotoFace: string | null = null;
  previewPhotoProfil: string | null = null;
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  /**
   * Gérer l'upload de la photo de visage
   */
  onPhotoVisageChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.convertToBase64(file, 'photoVisage');
    }
  }
  
  /**
   * Gérer l'upload de la photo de face
   */
  onPhotoFaceChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.convertToBase64(file, 'photoFace');
    }
  }
  
  /**
   * Gérer l'upload de la photo de profil
   */
  onPhotoProfilChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.convertToBase64(file, 'photoProfil');
    }
  }
  
  /**
   * Convertir une image en Base64
   */
  private convertToBase64(file: File, fieldName: string): void {
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Veuillez sélectionner une image valide';
      return;
    }
    
    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'L\'image ne doit pas dépasser 5MB';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      
      // Assigner au bon champ
      switch(fieldName) {
        case 'photoVisage':
          this.user.photoVisage = base64;
          this.previewPhotoVisage = base64;
          break;
        case 'photoFace':
          this.user.photoFace = base64;
          this.previewPhotoFace = base64;
          break;
        case 'photoProfil':
          this.user.photoProfil = base64;
          this.previewPhotoProfil = base64;
          break;
      }
    };
    reader.readAsDataURL(file);
  }
  
  /**
   * Valider le formulaire
   */
  private validateForm(): boolean {
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
    
    if (!this.user.cin) {
      this.errorMessage = 'Le CIN est obligatoire';
      return false;
    }
    
    if (!this.user.carteEtudiant) {
      this.errorMessage = 'Le numéro de carte d\'étudiant est obligatoire';
      return false;
    }
    
    if (!this.user.photoVisage) {
      this.errorMessage = 'La photo de visage est obligatoire';
      return false;
    }
    
    if (!this.user.photoFace) {
      this.errorMessage = 'La photo de face est obligatoire';
      return false;
    }
    
    if (!this.user.photoProfil) {
      this.errorMessage = 'La photo de profil est obligatoire';
      return false;
    }
    
    return true;
  }
  
  /**
   * Soumettre le formulaire
   */
  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    
    if (!this.validateForm()) {
      return;
    }
    
    this.isLoading = true;
    
    this.authService.register(this.user).subscribe({
      next: (response) => {
        this.successMessage = 'Inscription réussie ! Redirection...';
        this.isLoading = false;
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.errorMessage = error.error || 'Une erreur est survenue lors de l\'inscription';
        this.isLoading = false;
      }
    });
  }
  
  goBack(): void {
    this.router.navigate(['/signup-choice']);
  }
}