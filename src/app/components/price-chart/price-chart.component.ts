import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, ElementRef, ViewChild } from '@angular/core';

declare const TradingView: any; // ✅ Déclare la variable globale fournie par le script TradingView

@Component({
  selector: 'app-price-chart',
  templateUrl: './price-chart.component.html',
  styleUrls: ['./price-chart.component.css']
})
export class PriceChartComponent implements AfterViewInit, OnChanges {
  @Input() symbol: string = 'AAPL'; // le symbole de l’action (AAPL, AMZN…)
  @ViewChild('tvContainer', { static: true }) tvContainer!: ElementRef;

  ngAfterViewInit(): void {
    this.loadWidget(this.symbol);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['symbol'] && !changes['symbol'].isFirstChange()) {
      this.loadWidget(this.symbol);
    }
  }

  private loadWidget(symbol: string): void {
    // 🔄 Efface l’ancien widget si tu changes de symbole
    if (this.tvContainer?.nativeElement) {
      this.tvContainer.nativeElement.innerHTML = '';
    }

    // ✅ Crée le widget TradingView
    new TradingView.widget({
      autosize: true,
      symbol: symbol,                 // ex: "NASDAQ:AAPL" ou "AMZN"
      interval: "1",                  // 1 minute
      timezone: "Etc/UTC",
      theme: "dark",                  // thème sombre
      style: "1",                     // 1 = bougies japonaises
      locale: "fr",
      toolbar_bg: "#1e293b",
      enable_publishing: false,
      hide_legend: false,
      allow_symbol_change: false,
      container_id: "tradingview_container",
    });
  }
}
