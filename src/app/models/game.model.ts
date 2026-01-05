// src/app/models/game.model.ts

export interface GameRoom {
  id: string;
  name: string;
  scenario: 'NORMAL' | 'CRASH_2008' | 'COVID_2020' | 'VOLATILE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  maxPlayers: number;
  currentPlayers: number;
  duration: number; // en minutes
  initialBudget: number;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface Player {
  id: string;
  username: string;
  avatar?: string;
  portfolioValue: number;
  cash: number;
  rank: number;
  pnl: number;
  pnlPercent: number;
  isOnline: boolean;
  joinedAt: Date;
}

export interface Leaderboard {
  roomId: string;
  players: Player[];
  lastUpdate: Date;
}

export interface GameEvent {
  id: string;
  roomId: string;
  type: 'MARKET_CRASH' | 'NEWS' | 'VOLATILITY' | 'FED_ANNOUNCEMENT' | 'BANKRUPTCY';
  title: string;
  description: string;
  impact: number; // Pourcentage d'impact sur les prix
  timestamp: Date;
  duration?: number; // Durée en secondes
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'USER' | 'SYSTEM' | 'BOT';
}

export interface RoomParticipant {
  userId: string;
  username: string;
  status: 'ACTIVE' | 'OBSERVING' | 'LEFT';
  joinedAt: Date;
}