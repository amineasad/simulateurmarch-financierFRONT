import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bot, BotTemplate, StrategyType, BotStatus } from '../models/bot.model';

@Injectable({
  providedIn: 'root'
})
export class BotService {
  private apiUrl = 'http://localhost:9090/examen/api/bots';

  constructor(private http: HttpClient) { }

  // Bot Management
  createBot(bot: Bot): Observable<Bot> {
    return this.http.post<Bot>(this.apiUrl, bot);
  }

  updateBot(id: number, bot: Bot): Observable<Bot> {
    return this.http.put<Bot>(`${this.apiUrl}/${id}`, bot);
  }

  getBot(id: number): Observable<Bot> {
    return this.http.get<Bot>(`${this.apiUrl}/${id}`);
  }

  getUserBots(userId: number): Observable<Bot[]> {
    return this.http.get<Bot[]>(`${this.apiUrl}/user/${userId}`);
  }

  deleteBot(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateBotStatus(id: number, status: BotStatus): Observable<Bot> {
    return this.http.patch<Bot>(`${this.apiUrl}/${id}/status`, null, { params: { status } });
  }

  // Marketplace
  getAllTemplates(): Observable<BotTemplate[]> {
    return this.http.get<BotTemplate[]>(`${this.apiUrl}/marketplace`);
  }

  getTemplatesByStrategy(strategyType: StrategyType): Observable<BotTemplate[]> {
    return this.http.get<BotTemplate[]>(`${this.apiUrl}/marketplace/strategy/${strategyType}`);
  }

  createTemplate(template: BotTemplate): Observable<BotTemplate> {
    return this.http.post<BotTemplate>(`${this.apiUrl}/marketplace`, template);
  }
}
