// src/app/app.component.ts → VERSION FINALE ULTIME – FONCTIONNELLE À 100%
import { Component, OnInit } from '@angular/core';
import { ForumService, PostResponse } from './forum.service';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  posts: PostResponse[] = [];
  newPostContent = '';
  selectedFile: File | null = null;
  previewImage: string | null = null;

  isDarkMode = false;
  typingNames = ['Martin Emma', 'Dupont Lucas', 'Alex Trader', 'Sarah Pro', 'Dev Forum', 'John Wick'];

  constructor(private forumService: ForumService) {}

  ngOnInit(): void {
    this.loadPosts();
  }

 loadPosts(): void {
  this.forumService.getAllPosts().subscribe(posts => {
    this.posts = posts.map(p => ({
      ...p,
      showComments: !!p.showComments,     // CORRIGÉ
      newComment: '',
      isTyping: false,
      _typingTimer: null as any
    }));
  });
}

  publishPost(): void {
    const content = this.newPostContent.trim();

    if (!content && !this.selectedFile) return;

    if (this.selectedFile) {
      // Post avec image (texte optionnel)
      this.forumService.uploadPostWithImage(content, this.selectedFile).subscribe({
        next: () => this.afterSuccess(),
        error: (err) => {
          console.error('Erreur upload image:', err);
          alert('Erreur lors de l\'envoi de l\'image. Réessaie !');
        }
      });
    } else {
      // Post texte seul
      this.forumService.createPost(content).subscribe({
        next: () => this.afterSuccess(),
        error: (err) => console.error('Erreur création post:', err)
      });
    }
  }

  private afterSuccess(): void {
    this.resetPostForm();
    this.loadPosts();
    this.launchConfetti();
  }

  private resetPostForm(): void {
    this.newPostContent = '';
    this.selectedFile = null;
    this.previewImage = null;
  }

  private launchConfetti(): void {
    confetti({
      particleCount: 130,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#ffa726']
    });
  }

  toggleComments(post: any): void {
    post.showComments = !post.showComments;
  }

  like(post: any): void {
    this.forumService.toggleLike(post.id).subscribe(() => this.loadPosts());
  }

  sendComment(post: any): void {
    const content = (post.newComment || '').trim();
    if (!content) return;

    this.forumService.addComment(post.id, content).subscribe(() => {
      post.newComment = '';
      this.loadPosts();
    });
  }

  onCommentInput(post: any): void {
    post.isTyping = true;
    if (post._typingTimer) clearTimeout(post._typingTimer);
    post._typingTimer = setTimeout(() => post.isTyping = false, 2000);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => this.previewImage = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.previewImage = null;
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark-mode', this.isDarkMode);
  }

  // Avatar identique pour le même nom
 getAvatar(item: any): string {
  let photo = '';

  // Version SANS aucun ?. ni ?? → compatible partout
  if (item && item.authorPhotoProfil) {
    photo = item.authorPhotoProfil;
  } else if (item && item.author && item.author.photoProfil) {
    photo = item.author.photoProfil;
  } else if (item && item.author && item.author.photo) {
    photo = item.author.photo;
  } else if (item && item.user && item.user.photoProfil) {
    photo = item.user.photoProfil;
  } else if (item && item.photoProfil) {
    photo = item.photoProfil;
  }

  if (photo && photo.trim() !== '') {
    return photo;
  }

  // Avatar par défaut avec seed
  const name = (item && item.authorFullName) ? item.authorFullName.trim() : 'user';
  const seed = name.toLowerCase().replace(/\s+/g, '');
  return `https://i.pravatar.cc/150?seed=${seed}`;
}
}