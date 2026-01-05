import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, ElementRef, ViewChild } from '@angular/core';

declare const TradingView: any; // fourni par tv.js

@Component({
  selector: 'app-price-chart',
  templateUrl: './price-chart.component.html',
  styleUrls: ['./price-chart.component.css']
})
export class PriceChartComponent implements AfterViewInit, OnChanges {
  @Input() symbol: string = 'NASDAQ:AAPL';   // symbole COMPLET TradingView
  @Input() interval: string = '1';           // 1, 5, 15, 60, 240, D, W, M...
  @Input() theme: 'dark' | 'light' = 'dark';
  @Input() autosize = true;

  // id unique pour éviter les collisions
  containerId = 'tv_' + Math.random().toString(36).slice(2);

  @ViewChild('tvContainer', { static: true }) tvContainer!: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    this.loadWidget();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['symbol'] && !changes['symbol'].isFirstChange()) {
      this.reload();
    }
  }

  private reload() {
    if (this.tvContainer?.nativeElement) {
      this.tvContainer.nativeElement.innerHTML = '';
    }
    this.loadWidget();
  }

  private loadWidget(): void {
    if (typeof TradingView === 'undefined') return;

    new TradingView.widget({
      autosize: this.autosize,
      symbol: this.symbol,         // ex: NASDAQ:AAPL | OANDA:EURUSD | OANDA:XAUUSD
      interval: this.interval,     // "1" = 1 minute
      timezone: "Etc/UTC",
      theme: this.theme,
      style: "1",                  // chandeliers
      locale: "fr",
      toolbar_bg: "#1e293b",
      enable_publishing: false,
      hide_legend: false,
      allow_symbol_change: false,
      container_id: this.containerId
    });
  }
}
