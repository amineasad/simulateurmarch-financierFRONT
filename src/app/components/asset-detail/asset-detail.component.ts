// src/app/components/asset-detail/asset-detail.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-asset-detail',
  templateUrl: './asset-detail.component.html',
  styleUrls: ['./asset-detail.component.css']
})
export class AssetDetailComponent implements OnInit, OnDestroy {
  // ====== paramètres / symboles ======
  symbol: string = '';
  from: string = '';
  to: string = '';
  tvSymbol: string = 'NASDAQ:AAPL';

  // ====== métriques / indicateurs (mock visuel) ======
  price = 0;
  maxValue = 0;
  minValue = 0;
  volatility = 0;
  volume = 0;

  priceChange = 0;
  priceChangePercent = 0;
  currentTime = '';
  previousPrice = 0;

  rsi = 50;
  macd = 0;
  ma20 = 0;
  bb_upper = 0;
  bb_lower = 0;
  bb_width = 0;
  stoch = 0;
  adx = 0;
  atr = 0;
  support = 0;
  resistance = 0;

  // ====== carrousel ======
  carouselIndex = 0;

  // timer local pour animer les cartes
  private updateInterval: any;
  private basePrice = 0;

  constructor(private route: ActivatedRoute, private location: Location) {}

  ngOnInit(): void {
    this.symbol = this.route.snapshot.paramMap.get('symbol') || '';
    this.from   = this.route.snapshot.paramMap.get('from') || '';
    this.to     = this.route.snapshot.paramMap.get('to') || '';

    this.tvSymbol = this.buildTvSymbol(this.symbol, this.from, this.to);

    // Animation légère des cartes
    this.basePrice = 100 + Math.random() * 400;
    this.previousPrice = this.basePrice;
    this.tickLocalMetrics();
    this.updateInterval = setInterval(() => this.tickLocalMetrics(), 3000);
  }

  ngOnDestroy(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
  }

  goBack(): void {
    this.location.back();
  }

  // ---------- méthodes attendues par le template ----------

  /** Boutons BUY/SELL de l’entête (simple feedback visuel) */
  executeTrade(side: 'BUY' | 'SELL'): void {
    const msg = side === 'BUY' ? '🟢 ACHAT' : '🔴 VENTE';
    alert(`${msg} ${this.symbol || this.tvSymbol} @ $${this.price.toFixed(2)}`);
    console.log(`[TRADE] ${side} ${this.symbol || this.tvSymbol} at ${this.price}`);
  }

  /** Flèches du carrousel d’indicateurs */
  moveCarousel(direction: 'prev' | 'next'): void {
    const totalCards = 8;             // nombre total de cartes affichées
    const visible = 3;                // nb visibles à l’écran (pour la limite)
    const maxIndex = Math.max(0, totalCards - visible);

    if (direction === 'next') {
      this.carouselIndex = (this.carouselIndex + 1) % (maxIndex + 1);
    } else {
      this.carouselIndex = (this.carouselIndex - 1 + (maxIndex + 1)) % (maxIndex + 1);
    }

    const track = document.querySelector('.carousel-track') as HTMLElement | null;
    if (track) {
      track.style.transform = `translateX(-${this.carouselIndex * 310}px)`; // 280px carte + ~30px gap
      track.style.transition = 'transform 300ms ease';
    }
  }

  // ---------- helpers ----------

  /** Normalise le symbole pour TradingView */
  private buildTvSymbol(raw: string, from?: string, to?: string): string {
    if (!raw && from && to) raw = (from + to).toUpperCase();
    if (!raw) return 'NASDAQ:AAPL';
    if (raw.includes(':')) return raw; // déjà préfixé (NASDAQ:, OANDA:, ...)

    const u = raw.toUpperCase();
    if (u.length === 6) return `OANDA:${u}`; // EURUSD, XAUUSD…

    return `NASDAQ:${u}`; // fallback actions
  }

  /** Met à jour les valeurs des cartes (mock) */
  private tickLocalMetrics() {
    const variation = (Math.random() - 0.5) * 0.04;
    this.price = this.basePrice * (1 + variation);
    this.basePrice = this.price;

    this.priceChange = this.price - this.previousPrice;
    this.priceChangePercent = (this.priceChange / (this.previousPrice || this.price)) * 100;
    this.previousPrice = this.price;

    this.maxValue = this.price * 1.05;
    this.minValue = this.price * 0.95;
    this.volatility = Math.random() * 3 + 1;
    this.volume = Math.random() * 500000 + 500000;

    this.rsi = 30 + Math.random() * 40;
    this.macd = (Math.random() - 0.5) * 0.05;
    this.ma20 = this.price * (0.98 + Math.random() * 0.04);
    this.bb_upper = this.price * 1.03;
    this.bb_lower = this.price * 0.97;
    this.bb_width = (this.bb_upper - this.bb_lower) / this.price;
    this.stoch = 20 + Math.random() * 60;
    this.adx = 20 + Math.random() * 50;
    this.atr = this.price * 0.02;
    this.support = this.price * 0.95;
    this.resistance = this.price * 1.05;

    this.currentTime = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
}
