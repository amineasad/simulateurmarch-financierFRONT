import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-price-chart',
  templateUrl: './price-chart.component.html',
  styleUrls: ['./price-chart.component.css']
})
export class PriceChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() symbol: string = 'AAPL';
  
  private chart: Chart | null = null;
  private priceData: number[] = [];
  private timeLabels: string[] = [];
  private maxDataPoints = 50;
  private updateInterval: any;

  ngOnInit(): void {
    this.initChart();
    this.startSimulation();
  }

  private initChart(): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Données initiales
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000);
      this.timeLabels.push(time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      this.priceData.push(150 + Math.random() * 10);
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: this.timeLabels,
        datasets: [{
          label: this.symbol,
          data: this.priceData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: 'rgb(34, 197, 94)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#e2e8f0',
            bodyColor: '#e2e8f0',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => {
                return `Prix: ${context.parsed.y.toFixed(2)}€`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: 'rgba(51, 65, 85, 0.3)'
            },
            border: {
              display: false
            },
            ticks: {
              color: '#64748b',
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 8
            }
          },
          y: {
            display: true,
            position: 'right',
            grid: {
              color: 'rgba(51, 65, 85, 0.3)'
            },
            border: {
              display: false
            },
            ticks: {
              color: '#64748b',
              callback: function(value) {
                return `${value}€`;
              }
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private startSimulation(): void {
    // Simuler des mises à jour de prix toutes les 3 secondes
    this.updateInterval = setInterval(() => {
      this.updateChart(150 + Math.random() * 10);
    }, 3000);
  }

  public updateChart(newPrice: number): void {
    if (!this.chart) return;

    const now = new Date();
    const timeLabel = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    this.priceData.push(newPrice);
    this.timeLabels.push(timeLabel);

    // Garder seulement les X derniers points
    if (this.priceData.length > this.maxDataPoints) {
      this.priceData.shift();
      this.timeLabels.shift();
    }

    // Changer la couleur selon la tendance
    const isUp = this.priceData.length > 1 && 
                 newPrice > this.priceData[this.priceData.length - 2];
    
    this.chart.data.datasets[0].borderColor = isUp ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
    this.chart.data.datasets[0].backgroundColor = isUp ? 
      'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    this.chart.update('none');
  }

  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.chart) {
      this.chart.destroy();
    }
  }
}