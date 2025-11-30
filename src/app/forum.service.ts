// src/app/forum.service.ts
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
  likeCount: number;
  userLiked: boolean;
  comments: CommentDto[];

  // Ces 3 champs sont OPTIONNELS → parfait pour texte seul ou avec image
  imagePath?: string | null;   // ← null ou undefined si pas d'image
  showComments?: boolean;
  newComment?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ForumService {
  private baseUrl = 'http://localhost:9090/forum/api/forum';

  constructor(private http: HttpClient) {}

  // Forum global → plus de sessionId
  getAllPosts(): Observable<PostResponse[]> {
    return this.http.get<PostResponse[]>(`${this.baseUrl}/posts`);
  }
// Ajoute cette méthode dans ton ForumService
uploadPostWithImage(content: string, file: File | null): Observable<PostResponse> {
  const formData = new FormData();
  formData.append('content', content || ''); // au cas où content est vide
  if (file) {
    formData.append('image', file, file.name);
  }

  // URL 100% CORRECTE avec ton backend réel
  return this.http.post<PostResponse>(
    `${this.baseUrl}/with-image`,   // ← C'EST TOUT ! Rien d'autre !
    formData
  );
}
  createPost(content: string) {
    return this.http.post<PostResponse>(`${this.baseUrl}/post`, { content });
  }

  addComment(postId: number, content: string) {
    return this.http.post(`${this.baseUrl}/posts/${postId}/comment`, { content });
  }

  toggleLike(postId: number) {
    return this.http.post(`${this.baseUrl}/posts/${postId}/like`, {});
  }
}