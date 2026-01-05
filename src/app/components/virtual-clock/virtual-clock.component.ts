// src/app/components/virtual-clock/virtual-clock.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { TradingSessionService, VirtualClockResponse } from '../../services/trading-session.service';

@Component({
  selector: 'app-virtual-clock',
  templateUrl: './virtual-clock.component.html',
  styleUrls: ['./virtual-clock.component.css']
})
export class VirtualClockComponent implements OnInit, OnDestroy {
  @Input() sessionId!: number;
  
  clockData?: VirtualClockResponse;
  private pollSub?: Subscription;
  
  // États pour les animations
  isPulsing = false;
  
  constructor(private sessionService: TradingSessionService) {}
  
  ngOnInit(): void {
    if (!this.sessionId) {
      console.error('sessionId is required for virtual-clock');
      return;
    }
    
    // Charger immédiatement
    this.loadClockData();
    
    // Mise à jour toutes les 2 secondes
    this.pollSub = interval(2000).subscribe(() => {
      this.loadClockData();
    });
  }
  
  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
  
  private loadClockData(): void {
    this.sessionService.getVirtualClock(this.sessionId).subscribe({
      next: (data) => {
        this.clockData = data;
        
        // Animation pulse sur changement de minute
        const oldMinute = this.getMinute(this.clockData?.virtualTime);
        const newMinute = this.getMinute(data.virtualTime);
        if (oldMinute !== newMinute) {
          this.triggerPulse();
        }
      },
      error: (err) => {
        console.error('Erreur chargement horloge virtuelle', err);
      }
    });
  }
  
  private getMinute(timeStr?: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[1] || '0', 10);
  }
  
  private triggerPulse(): void {
    this.isPulsing = true;
    setTimeout(() => this.isPulsing = false, 500);
  }
  
  formatRealTime(minutes?: number): string {
    if (!minutes) return '--:--';
    
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}min`;
    }
    return `${mins}min`;
  }
  
  getPhaseClass(): string {
    const phase = this.clockData?.phase?.toLowerCase() || '';
    return phase;
  }
  
  getPhaseEmoji(): string {
    const phase = this.clockData?.phase?.toUpperCase();
    switch (phase) {
      case 'PRE_MARKET': return '⏰';
      case 'OPENING': return '🔴';
      case 'MID_DAY': return '🟢';
      case 'CLOSING': return '🟠';
      case 'AFTER_MARKET': return '⚫';
      default: return '⏰';
    }
  }
  
  getProgressColor(): string {
    const progress = (this.clockData?.progressPercentage || 0) * 100;
    if (progress < 33) return '#3b82f6'; // Bleu
    if (progress < 66) return '#8b5cf6'; // Violet
    return '#ec4899'; // Rose (fin proche)
  }
}