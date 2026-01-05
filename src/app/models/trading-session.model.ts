// src/app/models/trading-session.model.ts

export enum SessionStatus {
  WAITING = 'WAITING',
  OPEN = 'OPEN',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED'
}

export interface TradingSession {
  id?: number;
  nom: string;
  description?: string;
  status: SessionStatus;
  heureDebut: string; // ISO string
  heureFin: string;
  dureeMinutes: number;
  maxParticipants: number;
  modeAccelere: boolean;
  cashInitial: number;
  codeAcces?: string;
  createurId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionParticipation {
  id?: number;
  sessionId: number;
  userId: number;
  cashActuel: number;
  valeurPortefeuille: number;
  rendement: number;
  classement?: number;
  connecte: boolean;
  heureConnexion?: string;
  heureDeconnexion?: string;
  nombreOrdres: number;
  volumeTotal: number;
}

export enum EventType {
  CRISE_FINANCIERE = 'CRISE_FINANCIERE',
  ANNONCE_ECONOMIQUE = 'ANNONCE_ECONOMIQUE',
  BULLE_SPECULATIVE = 'BULLE_SPECULATIVE',
  EVENEMENT_SECTORIEL = 'EVENEMENT_SECTORIEL',
  GEOPOLITIQUE = 'GEOPOLITIQUE'
}

export enum EventSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface MarketEvent {
  id?: number;
  sessionId: number;
  type: EventType;
  titre: string;
  description?: string;
  severite: EventSeverity;
  declenchementPrevu?: string;
  declenchementReel?: string;
  declenche: boolean;
  impactsJson?: string;
  impactGlobal?: number;
  dureeMinutes?: number;
  impacts?: { [symbol: string]: number }; 
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP = 'STOP'
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  EXECUTED = 'EXECUTED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export interface SessionOrder {
  id?: number;
  sessionId: number;
  userId: number;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  price: number;
  quantity: number;
  status: OrderStatus;
  executionPrice?: number;
  orderTime?: string;
  executionTime?: string;
  rejectionReason?: string;
}