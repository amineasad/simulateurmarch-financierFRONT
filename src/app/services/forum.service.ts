// src/app/services/forum.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CommentDto {
  id: number;
  content: string;
  authorFullName: string;
  createdAt: string;
}

export interface PostResponse {
  id: number;
  content: string;
  createdAt: string;
  authorFullName: string;
  authorPhotoProfil: string;
  authorId?: number; // ✅ Pour identifier le propriétaire du post
  likeCount: number;
  userLiked: boolean;
  comments: CommentDto[];
  
  // Champs optionnels
  imagePath?: string | null;
  
  // ✅ Propriétés ajoutées côté frontend pour l'UI
  showComments?: boolean;
  newComment?: string;
  isTyping?: boolean;
  _typingTimer?: any; // ✅ CORRIGÉ : Timer pour l'effet "typing..."
}

@Injectable({
  providedIn: 'root'
})
export class ForumService {
  private baseUrl = 'http://localhost:9090/examen/api/forum';

  constructor(private http: HttpClient) {}

  // ========== RÉCUPÉRATION DES POSTS ==========

  /**
   * Récupère tous les posts
   */
  getAllPosts(): Observable<PostResponse[]> {
    return this.http.get<PostResponse[]>(`${this.baseUrl}/posts`);
  }

  // ========== ✅ CRÉATION DE POSTS (AVEC USER ID) ==========

  /**
   * ✅ Crée un post simple (texte seulement)
   * @param userId ID de l'utilisateur connecté
   * @param content Contenu du post
   */
  createPost(userId: number, content: string): Observable<PostResponse> {
    return this.http.post<PostResponse>(
      `${this.baseUrl}/post/user/${userId}`, 
      { content }
    );
  }

  /**
   * ✅ Crée un post avec image
   * @param userId ID de l'utilisateur connecté
   * @param content Contenu du post (optionnel)
   * @param file Fichier image
   */
  uploadPostWithImage(userId: number, content: string, file: File | null): Observable<PostResponse> {
    const formData = new FormData();
    formData.append('content', content || '');
    if (file) {
      formData.append('image', file, file.name);
    }

    return this.http.post<PostResponse>(
      `${this.baseUrl}/with-image/user/${userId}`,
      formData
    );
  }

  // ========== ✅ COMMENTAIRES (AVEC USER ID) ==========

  /**
   * ✅ Ajoute un commentaire
   * @param userId ID de l'utilisateur connecté
   * @param postId ID du post
   * @param content Contenu du commentaire
   */
  addComment(userId: number, postId: number, content: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/posts/${postId}/comment/user/${userId}`, 
      { content }
    );
  }

  // ========== ✅ LIKES (AVEC USER ID) ==========

  /**
   * ✅ Toggle like sur un post
   * @param userId ID de l'utilisateur connecté
   * @param postId ID du post
   */
  toggleLike(userId: number, postId: number): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/posts/${postId}/like/user/${userId}`, 
      {}
    );
  }
}