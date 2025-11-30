// src/app/components/forum/forum.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ForumService, PostResponse } from '../../services/forum.service';
import { AuthService, User } from '../../services/auth.service';
import { Router } from '@angular/router';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-forum',
  templateUrl: './forum.component.html',
  styleUrls: ['./forum.component.css']
})
export class ForumComponent implements OnInit, OnDestroy {

  // ========== DONNÉES ==========
  posts: PostResponse[] = [];
  
  // Formulaire nouveau post
  newPostContent = '';
  selectedFile: File | null = null;
  previewImage: string | null = null;
  
  // UI State
  isDarkMode = false;
  isLoading = false;
  
  // ========== ✅ UTILISATEUR CONNECTÉ ==========
  currentUser: User | null = null;
  currentUserId: number = 1; // Fallback si pas connecté

  constructor(
    private forumService: ForumService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Vérifier si l'utilisateur est connecté
    if (!this.authService.isLoggedIn()) {
      console.warn('⚠️ Utilisateur non connecté, redirection...');
      this.router.navigate(['/login']);
      return;
    }

    // Récupérer l'utilisateur connecté
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.id) {
      this.currentUserId = this.currentUser.id;
      console.log('✅ Utilisateur connecté:', this.currentUser.nom, this.currentUser.prenom, '(ID:', this.currentUserId, ')');
    }

    this.loadPosts();
    this.loadDarkModePreference();
  }

  ngOnDestroy(): void {
    // Nettoyer les timers de typing
    this.posts.forEach(post => {
      if (post._typingTimer) {
        clearTimeout(post._typingTimer);
      }
    });
  }
  

  // ========== CHARGEMENT DES POSTS ==========

  /**
   * Charge tous les posts depuis le backend
   */
  loadPosts(): void {
    this.isLoading = true;
    this.forumService.getAllPosts().subscribe({
      next: (posts) => {
        this.posts = posts.map(p => ({
          ...p,
          showComments: p.showComments || false,
          newComment: '',
          isTyping: false,
          _typingTimer: null as any
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement posts:', err);
        this.isLoading = false;
      }
    });
  }

  // ========== CRÉATION DE POSTS ==========

  /**
   * Publie un nouveau post (texte ou texte + image)
   */
  publishPost(): void {
    const content = this.newPostContent.trim();

    // Validation
    if (!content && !this.selectedFile) {
      alert('📝 Écris quelque chose ou ajoute une image !');
      return;
    }

    this.isLoading = true;

    if (this.selectedFile) {
      // Post avec image
      this.forumService.uploadPostWithImage(this.currentUserId, content, this.selectedFile).subscribe({
        next: () => this.handlePostSuccess('Post avec image publié ! 🎉'),
        error: (err) => this.handlePostError(err, 'image')
      });
    } else {
      // Post texte seul
      this.forumService.createPost(this.currentUserId, content).subscribe({
        next: () => this.handlePostSuccess('Post publié ! 🎉'),
        error: (err) => this.handlePostError(err, 'texte')
      });
    }
  }

  /**
   * Gestion du succès de publication
   */
  private handlePostSuccess(message: string): void {
    console.log('✅', message);
    this.resetPostForm();
    this.loadPosts();
    this.launchConfetti();
    this.isLoading = false;
  }

  /**
   * Gestion des erreurs de publication
   */
  private handlePostError(error: any, type: string): void {
    console.error(`❌ Erreur création post ${type}:`, error);
    alert(`Erreur lors de la publication du post ${type}. Réessaie !`);
    this.isLoading = false;
  }

  /**
   * Réinitialise le formulaire de création de post
   */
  private resetPostForm(): void {
    this.newPostContent = '';
    this.selectedFile = null;
    this.previewImage = null;
  }

  // ========== GESTION DES IMAGES ==========

  /**
   * Gère la sélection d'une image
   */
  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    
    if (!file) return;

    // Validation du type
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Sélectionne une image valide (JPG, PNG, GIF, etc.)');
      return;
    }

    // Validation de la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('⚠️ L\'image est trop volumineuse (max 5MB)');
      return;
    }

    this.selectedFile = file;

    // Prévisualisation
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImage = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Supprime l'image sélectionnée
   */
  removeImage(): void {
    this.selectedFile = null;
    this.previewImage = null;
  }
  

  // ========== LIKES ==========

  /**
   * Toggle like sur un post
   */
  like(post: PostResponse): void {
    this.forumService.toggleLike(this.currentUserId, post.id).subscribe({
      next: () => {
        // Mise à jour optimiste de l'UI
        post.userLiked = !post.userLiked;
        post.likeCount += post.userLiked ? 1 : -1;
        
        // Recharge complète pour synchroniser
        this.loadPosts();
      },
      error: (err) => {
        console.error('❌ Erreur toggle like:', err);
        alert('Erreur lors du like. Réessaie !');
      }
    });
  }

  // ========== COMMENTAIRES ==========

  /**
   * Toggle affichage des commentaires
   */
  toggleComments(post: PostResponse): void {
    post.showComments = !post.showComments;
  }

  /**
   * Envoie un commentaire
   */
  sendComment(post: any): void {
    const content = (post.newComment || '').trim();
    
    if (!content) {
      alert('📝 Écris un commentaire avant d\'envoyer !');
      return;
    }

    this.forumService.addComment(this.currentUserId, post.id, content).subscribe({
      next: () => {
        console.log('✅ Commentaire ajouté');
        post.newComment = '';
        post.isTyping = false;
        this.loadPosts();
      },
      error: (err) => {
        console.error('❌ Erreur ajout commentaire:', err);
        alert('Erreur lors de l\'ajout du commentaire. Réessaie !');
      }
    });
  }

  /**
   * Détecte la saisie d'un commentaire (effet "typing...")
   */
  onCommentInput(post: any): void {
    post.isTyping = true;
    
    // Clear le timer précédent
    if (post._typingTimer) {
      clearTimeout(post._typingTimer);
    }
    
    // Arrête l'effet après 2 secondes d'inactivité
    post._typingTimer = setTimeout(() => {
      post.isTyping = false;
    }, 2000);
  }

  // ========== ANIMATIONS & EFFETS ==========

  /**
   * Lance des confettis après publication
   */
  private launchConfetti(): void {
    confetti({
      particleCount: 130,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#ffa726']
    });
  }

  // ========== MODE SOMBRE ==========

  /**
   * Toggle le mode sombre
   */
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark-mode', this.isDarkMode);
    localStorage.setItem('darkMode', String(this.isDarkMode));
  }

  /**
   * Charge la préférence de mode sombre
   */
  private loadDarkModePreference(): void {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      this.isDarkMode = true;
      document.documentElement.classList.add('dark-mode');
    }
  }

  // ========== UTILITAIRES ==========

  /**
   * Récupère l'avatar d'un utilisateur
   */
  getAvatar(item: any): string {
    // Priorité aux photos réelles
    const photos = [
      item?.authorPhotoProfil,
      item?.author?.photoProfil,
      item?.author?.photoFace,
      item?.author?.photoVisage,
      item?.user?.photoProfil,
      item?.photoProfil,
      item?.photoFace,
      item?.photoVisage
    ];

    for (const photo of photos) {
      if (photo && photo.trim() !== '') {
        return photo;
      }
    }

    // Avatar par défaut basé sur le nom
    const name = item?.authorFullName?.trim() || 'user';
    const hash = Math.abs(this.hashCode(name));
    return `https://i.pravatar.cc/150?img=${hash % 70}`;
  }

  /**
   * Récupère l'avatar de l'utilisateur connecté
   */
  getCurrentUserAvatar(): string {
    if (!this.currentUser) return 'https://i.pravatar.cc/150?img=1';
    
    const photos = [
      this.currentUser.photoProfil,
      this.currentUser.photoFace,
      this.currentUser.photoVisage
    ];

    for (const photo of photos) {
      if (photo && photo.trim() !== '') {
        return photo;
      }
    }

    // Avatar par défaut
    const fullName = `${this.currentUser.nom} ${this.currentUser.prenom}`;
    const hash = Math.abs(this.hashCode(fullName));
    return `https://i.pravatar.cc/150?img=${hash % 70}`;
  }

  /**
   * Récupère le nom complet de l'utilisateur connecté
   */
  getCurrentUserFullName(): string {
    if (!this.currentUser) return 'Utilisateur';
    return `${this.currentUser.nom} ${this.currentUser.prenom}`;
  }

  /**
   * Génère un hash à partir d'une chaîne
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDate(date: string): string {
    const now = new Date();
    const postDate = new Date(date);
    const diffMs = now.getTime() - postDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return postDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: postDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  /**
   * Vérifie si c'est le post de l'utilisateur actuel
   */
  isMyPost(post: PostResponse): boolean {
    return this.currentUser?.id === post.authorId;
  }

  /**
   * Se déconnecter
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Génère l'URL complète de l'image
   */
  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    
    // Si l'URL est déjà complète (commence par http)
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Construire l'URL complète
    const baseUrl = 'http://localhost:9090';
    
    // Si le chemin commence déjà par /examen, ne pas le dupliquer
    if (imagePath.startsWith('/examen')) {
      return baseUrl + imagePath;
    }
    
    // Sinon, construire le chemin complet
    return `${baseUrl}/examen${imagePath}`;
  }

  /**
   * Gère les erreurs de chargement d'image
   */
  onImageError(event: any): void {
    const target = event.target as HTMLImageElement;
    const originalSrc = target.src;
    
    console.warn('❌ Erreur de chargement image:', originalSrc);
    
    // Éviter la boucle infinie
    if (!target.src.includes('data:image/svg')) {
      // Image placeholder grise simple (data URL)
      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%231e293b" width="400" height="300"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImage non disponible%3C/text%3E%3C/svg%3E';
    }
  }
}