import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Chart, ChartConfiguration } from 'chart.js';
//import 'chartjs-chart-financial';
import { Location } from '@angular/common';

interface FinancialDataPoint {
  x: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

@Component({
  selector: 'app-asset-detail',
  templateUrl: './asset-detail.component.html',
  styleUrls: ['./asset-detail.component.css']
})
export class AssetDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  // === DONNÉES BASIQUES ===
  symbol: string = '';
  from: string = '';
  to: string = '';
  price: number = 0;
  maxValue: number = 0;
  minValue: number = 0;
  volatility: number = 0;
  volume: number = 0;

  // === VARIATION ===
  priceChange: number = 0;
  priceChangePercent: number = 0;
  currentTime: string = '';
  previousPrice: number = 0;

  // === 8 INDICATEURS IMPORTANTS ===
  rsi: number = 50;
  macd: number = 0;
  ma20: number = 0;
  bb_upper: number = 0;
  bb_lower: number = 0;
  stoch: number = 0;
  adx: number = 0;
  atr: number = 0;
  support: number = 0;
  resistance: number = 0;
  bb_width: number = 0;  // ✅ AJOUTÉ

  // === GRAPHIQUE ===
  chart: Chart | undefined;
  chartData: FinancialDataPoint[] = [];
  @ViewChild('assetChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  // === CARROUSEL 3D ===
  carouselIndex: number = 0;

  // === TIMER ===
  private updateInterval: any;
  private basePrice: number = 0;
  private candleIndex: number = 0;

  constructor(private route: ActivatedRoute, private location: Location) {}

  ngOnInit(): void {
    this.symbol = this.route.snapshot.paramMap.get('symbol') || '';
    this.from = this.route.snapshot.paramMap.get('from') || '';
    this.to = this.route.snapshot.paramMap.get('to') || '';
    
    this.basePrice = 100 + Math.random() * 400;
    this.previousPrice = this.basePrice;
    
    this.updateRealTimeData();
    this.initializeChartData();
    this.startRealTimeUpdates();
  }

  ngAfterViewInit(): void {
    if (!this.chartCanvas) return;
    this.initChart();
  }

  // ✅ MÉTHODE TRADE
  executeTrade(type: 'BUY' | 'SELL'): void {
    const action = type === 'BUY' ? '🟢 ACHAT' : '🔴 VENTE';
    console.log(`🚀 ${action}: ${this.symbol} @ $${this.price.toFixed(2)}`);
    alert(`${action} ${this.symbol} @ $${this.price.toFixed(2)}`);
  }

  // ✅ CARROUSEL 3D
  moveCarousel(direction: 'prev' | 'next'): void {
    const totalCards = 8;
    if (direction === 'next') {
      this.carouselIndex = (this.carouselIndex + 1) % (totalCards - 3);
    } else {
      this.carouselIndex = (this.carouselIndex - 1 + (totalCards - 3)) % (totalCards - 3);
    }
    
    const track = document.querySelector('.carousel-track') as HTMLElement;
    if (track) {
      track.style.transform = `translateX(-${this.carouselIndex * 310}px)`;
    }
  }

  // ✅ UPDATE COMPLET - 8 INDICATEURS
  private updateRealTimeData(): void {
    this.previousPrice = this.price || this.basePrice;
    
    const variation = (Math.random() - 0.5) * 0.04;
    this.price = this.basePrice * (1 + variation);
    this.basePrice = this.price;
    
    // VARIATION
    this.priceChange = this.price - this.previousPrice;
    this.priceChangePercent = (this.priceChange / this.previousPrice) * 100;
    
    // MÉTRIQUES
    this.maxValue = this.price * 1.05;
    this.minValue = this.price * 0.95;
    this.volatility = Math.random() * 3 + 1;
    this.volume = Math.random() * 500000 + 500000;
    
    // 8 INDICATEURS IMPORTANTS
    this.rsi = 30 + Math.random() * 40;
    this.macd = (Math.random() - 0.5) * 0.05;
    this.ma20 = this.price * (0.98 + Math.random() * 0.04);
    this.bb_upper = this.price * 1.03;
    this.bb_lower = this.price * 0.97;
    this.bb_width = (this.bb_upper - this.bb_lower) / this.price;  // ✅ AJOUTÉ
    this.stoch = 20 + Math.random() * 60;
    this.adx = 20 + Math.random() * 50;
    this.atr = this.price * 0.02;
    this.support = this.price * 0.95;
    this.resistance = this.price * 1.05;
    
    // TEMPS
    this.currentTime = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  private initializeChartData(): void {
    this.chartData = [];
    for (let i = 0; i < 10; i++) {
      const candlePrice = this.basePrice * (0.95 + Math.random() * 0.1);
      this.chartData.push({
        x: i,
        o: candlePrice,
        h: candlePrice * (1 + Math.random() * 0.02),
        l: candlePrice * (1 - Math.random() * 0.02),
        c: candlePrice * (1 + (Math.random() - 0.5) * 0.01)
      });
    }
    this.candleIndex = this.chartData.length;
  }

  private addNewCandle(): void {
    const lastCandle = this.chartData[this.chartData.length - 1];
    const newCandle: FinancialDataPoint = {
      x: this.candleIndex++,
      o: lastCandle.c,
      h: Math.max(lastCandle.c, this.price * 1.01),
      l: Math.min(lastCandle.c, this.price * 0.99),
      c: this.price
    };
    
    if (this.chartData.length >= 20) {
      this.chartData.shift();
      this.chartData.forEach(candle => candle.x--);
      this.candleIndex--;
    }
    this.chartData.push(newCandle);
  }

  private startRealTimeUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updateRealTimeData();
      this.addNewCandle();
      this.updateChart();
      
      const sign = this.priceChangePercent > 0 ? '+' : '';
      console.log(`[${this.currentTime}] ${this.symbol}: $${this.price.toFixed(2)} ${sign}${this.priceChangePercent.toFixed(1)}% | RSI: ${this.rsi.toFixed(0)}`);
    }, 3000);
  }

  private initChart(): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'candlestick' as const,
      data: {
        datasets: [{
          label: this.symbol || 'ASSET',
          data: this.chartData as any,
          borderColor: (context: any) => {
            const value = context.raw as FinancialDataPoint;
            return value.c > value.o ? '#00ff88' : value.c < value.o ? '#ff4d4d' : '#00d4ff';
          },
          backgroundColor: (context: any) => {
            const value = context.raw as FinancialDataPoint;
            return value.c > value.o ? 'rgba(0, 255, 136, 0.6)' : value.c < value.o ? 'rgba(255, 77, 77, 0.6)' : 'rgba(0, 212, 255, 0.4)';
          },
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { type: 'linear' as const, title: { display: true, text: 'Temps' }, ticks: { color: '#e2e8f0' } },
          y: { 
            title: { display: true, text: 'Prix (USD)' }, 
            ticks: { color: '#e2e8f0' }, 
            suggestedMin: this.minValue * 0.98, 
            suggestedMax: this.maxValue * 1.02 
          }
        },
        plugins: { 
          legend: { labels: { color: '#e2e8f0' } },
          title: { 
            display: true, 
            text: `📈 ${this.symbol || 'ASSET'} - LIVE: $${this.price.toFixed(2)}`,
            color: '#00ff88',
            font: { size: 16, weight: 'bold' }
          }
        }
      }
    } as any);
  }

  private updateChart(): void {
    if (this.chart) {
      this.chart.data.datasets[0].data = this.chartData as any;
      this.chart.options!.plugins!.title!.text = `📈 ${this.symbol || 'ASSET'} - LIVE: $${this.price.toFixed(2)}`;
      this.chart.update('none');
    }
  }

  ngOnDestroy(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.chart) this.chart.destroy();
  }

  goBack(): void {
    this.location.back();
  }
}