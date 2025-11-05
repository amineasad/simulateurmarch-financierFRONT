import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { PriceService } from '../../services/price.service';
import { Subscription, interval } from 'rxjs';

interface Stock {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  chartData: number[];
  isFavorite: boolean;
  rsi?: number;
  macd?: number;
}

interface ForexRate {
  from: string;
  to: string;
  rate: number;
  change: number;
}

interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
}

@Component({
  selector: 'app-price-display',
  templateUrl: './price-display.component.html',
  styleUrls: ['./price-display.component.css']
})
export class PriceDisplayComponent implements OnInit, OnDestroy {
  stockPrices: Stock[] = [];
  forexRates: ForexRate[] = [];
  metals: Stock[] = [];
  etfBonds: Stock[] = [];
  error: string | null = null;
  lastUpdate: Date | null = null;
  private updateSubscription: Subscription | null = null;

  // PHASE 2 : PORTFOLIO
  portfolio: PortfolioPosition[] = [
    { symbol: 'AAPL', quantity: 50, avgPrice: 180, currentPrice: 200 },
    { symbol: 'TSLA', quantity: 20, avgPrice: 240, currentPrice: 260 }
  ];
  cash = 95000;
  totalPnL = 5200;
  pnlPercent = 5.2;

  // Indicateurs
  marketVolume = 0;
  updateCount = 0;
  latency = 15;

  // PAGINATION
  activeTab: 'stocks' | 'forex' | 'metals' | 'etf-bond' = 'stocks';
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 15;
  searchTerm = '';

  // COCKPIT PRO
  isDarkTheme = true;
  showChart = false;
  selectedSymbol = '';
  currentTimeframe = '5m';
  topGainers: Stock[] = [];
  topLosers: Stock[] = [];

  // ALERTES PHASE 2
  notifications: { type: 'buy' | 'sell' | 'breakout' | 'favorite' | 'super-buy' | 'volume-explosion', message: string }[] = [];
  favorites: string[] = ['AAPL', 'TSLA', 'NVDA'];
  showTooltipData: any = null;
  tooltipX = 0;
  tooltipY = 0;

  // 70+ ACTIONS
  private stockSymbols: string[] = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'PYPL', 'INTC', 'AMD',
    'NFLX', 'ADBE', 'CRM', 'ORCL', 'IBM', 'NOW', 'SNOW', 'ZS', 'TEAM', 'DOCU',
    'QCOM', 'TXN', 'AVGO', 'MU', 'KLAC', 'LRCX', 'AMAT', 'ASML', 'MRVL', 'ADI',
    'JPM', 'BAC', 'WFC', 'GS', 'MS', 'AXP', 'V', 'MA', 'SQ', 'COIN',
    'XOM', 'CVX', 'KO', 'PEP', 'WMT', 'TGT', 'HD', 'LOW', 'NKE', 'SBUX',
    'JNJ', 'PFE', 'UNH', 'ABBV', 'TMO', 'DHR', 'MRK', 'AMGN', 'GILD', 'REGN'
  ];

  private forexPairs: string[][] = [
    ['EUR', 'USD'], ['USD', 'JPY'], ['GBP', 'USD'], ['USD', 'CHF'], ['AUD', 'USD'],
    ['USD', 'CAD'], ['NZD', 'USD'], ['EUR', 'GBP'], ['EUR', 'JPY'], ['EUR', 'CHF']
  ];

  private metalSymbols: string[] = ['GC=F', 'SI=F', 'PL=F', 'PD=F', 'HG=F', 'PA=F', 'RH=F', 'CU=F', 'AL=F', 'ZN=F'];
  private etfBondSymbols: string[] = ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VWO', 'EEM', 'GLD', 'SLV', 'TLT'];

  constructor(private priceService: PriceService, private router: Router) {}

  ngOnInit(): void {
    document.addEventListener('click', () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🎵 AudioContext ACTIVÉ - PHASE 2 OK!');
    }, { once: true });
    
    this.initializePrices();
    this.startPriceUpdates();
    this.toggleTheme();
  }

  ngOnDestroy(): void {
    if (this.updateSubscription) this.updateSubscription.unsubscribe();
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    document.body.classList.toggle('dark-theme', this.isDarkTheme);
  }

  // ✅ WATCHLIST
  toggleFavorite(symbol: string): void {
    const index = this.favorites.indexOf(symbol);
    if (index === -1) {
      this.favorites.push(symbol);
      console.log(`⭐ ${symbol} AJOUTÉ`);
    } else {
      this.favorites.splice(index, 1);
      console.log(`⭐ ${symbol} RETIRÉ`);
    }
  }

  isFavorite(symbol: string): boolean {
    return this.favorites.includes(symbol);
  }

  // ✅ TRADING BUTTONS PHASE 2
  buyStock(stock: Stock): void {
    this.portfolio.unshift({
      symbol: stock.symbol,
      quantity: 10,
      avgPrice: stock.price,
      currentPrice: stock.price
    });
    this.cash -= stock.price * 10;
    this.updatePnL();
    console.log(`💰 ACHAT ${stock.symbol} x10 @ $${stock.price}`);
  }

  sellStock(stock: Stock): void {
    const position = this.portfolio.find(p => p.symbol === stock.symbol);
    if (position) {
      this.cash += position.quantity * stock.price;
      this.portfolio = this.portfolio.filter(p => p.symbol !== stock.symbol);
      this.updatePnL();
      console.log(`💸 VENTE ${stock.symbol} x${position.quantity} @ $${stock.price}`);
    }
  }

  setStop(stock: Stock): void {
    this.notifications.unshift({
      type: 'sell',
      message: `🛑 STOP ${stock.symbol} -5% @ $${(stock.price * 0.95).toFixed(2)}`
    });
    this.playShortBeep();
  }

  updatePnL(): void {
    this.totalPnL = this.portfolio.reduce((sum, pos) => 
      sum + (pos.currentPrice - pos.avgPrice) * pos.quantity, 0);
    this.pnlPercent = (this.totalPnL / 100000) * 100;
  }

  // ✅ TOOLTIP
  showTooltip(symbol: string, event: MouseEvent): void {
    const item = [...this.stockPrices, ...this.metals, ...this.etfBonds].find(s => s.symbol === symbol);
    if (item) {
      this.showTooltipData = { symbol, chartData: item.chartData, rsi: item.rsi };
      this.tooltipX = event.clientX + 10;
      this.tooltipY = event.clientY - 50;
    }
  }

  hideTooltip(): void {
    this.showTooltipData = null;
  }

  // ✅ CHARTS PHASE 2 - CANVAS NATIVE (PAS CHART.JS)
  showChartModal(symbol: string): void {
    this.selectedSymbol = symbol;
    this.showChart = true;
    setTimeout(() => this.drawChart(), 100);
  }

  closeChart(): void {
    this.showChart = false;
  }

  changeTimeframe(timeframe: string): void {
    this.currentTimeframe = timeframe;
    this.drawChart();
  }

  drawChart(): void {
    const canvas = document.getElementById('tradingChart') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const stock = this.stockPrices.find(s => s.symbol === this.selectedSymbol);
    if (!stock) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw candlesticks (simplified)
    const data = stock.chartData;
    const barWidth = 25;
    const maxPrice = Math.max(...data);
    const minPrice = Math.min(...data);
    const priceRange = maxPrice - minPrice;
    
    for (let i = 0; i < data.length; i++) {
      const price = data[i];
      const prevPrice = data[i-1] || price;
      const height = ((price - minPrice) / priceRange) * 200;
      const x = i * barWidth + 50;
      
      // Body
      ctx.fillStyle = price > prevPrice ? '#00ff88' : '#ff4d4d';
      ctx.fillRect(x, 300 - height, barWidth-4, Math.abs(height * (Math.abs(price - prevPrice) / priceRange)));
      
      // Wick
      ctx.strokeStyle = price > prevPrice ? '#00ff88' : '#ff4d4d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + barWidth/2, 300 - height);
      ctx.lineTo(x + barWidth/2, 300);
      ctx.stroke();
    }

    // RSI Line
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 350 - (stock.rsi || 50));
    ctx.lineTo(450, 350 - (stock.rsi || 50));
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = 'white';
    ctx.font = '12px monospace';
    ctx.fillText(`RSI: ${stock.rsi?.toFixed(0)}`, 50, 370);
  }

  // ✅ 6 SONS PHASE 2
  playLongBeep(): void {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(1000, audioContext.currentTime + 0.8);
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.8);
    console.log('🎵 LONG BEEP');
  }

  playShortBeep(): void {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.value = 200;
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
    console.log('🎵 SHORT BEEP');
  }

  playDoubleBeep(): void {
    this.playShortBeep();
    setTimeout(() => this.playShortBeep(), 200);
    console.log('🎵 DOUBLE BEEP');
  }

  playWatchlistBeep(): void {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.value = 700;
    oscillator.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
    console.log('🎵 WATCHLIST BEEP');
  }

  playSuperBeep(): void {
    this.playLongBeep();
    setTimeout(() => this.playLongBeep(), 300);
    console.log('🚀🚀 SUPER BEEP +10%');
  }

  playExplosionBeep(): void {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.playShortBeep(), i * 150);
    }
    console.log('💥 EXPLOSION x5 Volume');
  }

  // TECHNICAL ANALYSIS
  calculateRSI(prices: number[], period = 14): number {
    if (prices.length < period) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i-1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  generateMiniChart(basePrice: number): number[] {
    const data = [];
    for (let i = 0; i < 20; i++) {
      data.push(basePrice * (0.95 + Math.random() * 0.1));
    }
    return data;
  }

  initializePrices(): void {
    this.lastUpdate = new Date();
    
    this.stockPrices = this.stockSymbols.map(symbol => {
      const basePrice = 100 + Math.random() * 400;
      const chartData = this.generateMiniChart(basePrice);
      return {
        symbol,
        price: basePrice,
        change: (Math.random() - 0.5) * 10,
        volume: Math.random() * 1000000 + 100000,
        chartData,
        rsi: this.calculateRSI(chartData),
        isFavorite: this.favorites.includes(symbol)
      };
    });
    
    this.forexRates = this.forexPairs.map(([from, to]) => ({
      from, to,
      rate: 0.8 + Math.random() * 1.5,
      change: (Math.random() - 0.5) * 0.01
    }));
    
    this.metals = this.metalSymbols.map(symbol => {
      const basePrice = 1000 + Math.random() * 2000;
      return {
        symbol,
        price: basePrice,
        change: (Math.random() - 0.5) * 50,
        volume: Math.random() * 500000 + 50000,
        chartData: this.generateMiniChart(basePrice),
        rsi: 50,
        isFavorite: false
      };
    });
    
    this.etfBonds = this.etfBondSymbols.map(symbol => {
      const basePrice = 50 + Math.random() * 150;
      return {
        symbol,
        price: basePrice,
        change: (Math.random() - 0.5) * 5,
        volume: Math.random() * 2000000 + 200000,
        chartData: this.generateMiniChart(basePrice),
        rsi: 50,
        isFavorite: false
      };
    });
    
    this.updateTopLists();
    this.updatePagination();
    this.updateMarketVolume();
  }

  // PHASE 2 : 6 ALERTES EN 60s
  startPriceUpdates(): void {
    this.updateSubscription = interval(2000).subscribe(() => {
      this.lastUpdate = new Date();
      this.updateCount++;
      const currentSecond = Math.floor(Date.now() / 1000) % 60;
      
      if (!this.isFavorite('AAPL')) this.favorites.push('AAPL');
      if (!this.isFavorite('TSLA')) this.favorites.push('TSLA');
      
      this.stockPrices = this.stockPrices.map((stock, index) => {
        let newChange = (Math.random() - 0.5) * 8;
        let newVolume = stock.volume * (1 + Math.random());
        const symbol = stock.symbol;
        
        // 🚀 15s : AAPL +6%
        if (index === 0 && currentSecond >= 12 && currentSecond <= 18) {
          newChange = 6;
          this.notifications.unshift({ type: 'buy', message: `🚀 ${symbol} +6.0%` });
          this.playLongBeep();
        }
        
        // 💥 25s : MSFT -6%
        if (index === 1 && currentSecond >= 22 && currentSecond <= 28) {
          newChange = -6;
          this.notifications.unshift({ type: 'sell', message: `💥 ${symbol} -6.0%` });
          this.playShortBeep();
        }
        
        // 📈 35s : GOOGL x2.5 Volume
        if (index === 2 && currentSecond >= 32 && currentSecond <= 38) {
          newVolume = stock.volume * 2.5;
          this.notifications.unshift({ type: 'breakout', message: `📈 ${symbol} Volume x2.5` });
          this.playDoubleBeep();
        }
        
        // ⭐ 45s : TSLA +5% Favori
        if (index === 5 && currentSecond >= 42 && currentSecond <= 48) {
          newChange = 5;
          this.notifications.unshift({ type: 'favorite', message: `⭐ ${symbol} +5.0% FAVORI` });
          this.playWatchlistBeep();
        }
        
        // 🚀🚀 50s : SUPER +12%
        if (index === 0 && currentSecond >= 48 && currentSecond <= 52) {
          newChange = 12;
          this.notifications.unshift({ type: 'super-buy', message: `🚀🚀 ${symbol} +12% EXPLOSION!` });
          this.playSuperBeep();
        }
        
        // 💥 55s : VOLUME x5
        if (index === 5 && currentSecond >= 53 && currentSecond <= 57) {
          newVolume = stock.volume * 5;
          this.notifications.unshift({ type: 'volume-explosion', message: `💥 ${symbol} Volume x5!` });
          this.playExplosionBeep();
        }
        
        const newPrice = stock.price * (1 + newChange / 100);
        const newChartData = [...stock.chartData.slice(1), newPrice];
        
        // Update RSI
        const newRSI = this.calculateRSI(newChartData);
        
        // Update portfolio prices
        this.portfolio.forEach(pos => {
          if (pos.symbol === symbol) pos.currentPrice = newPrice;
        });
        
        this.updatePnL();
        
        return { 
          ...stock, 
          price: newPrice, 
          change: newChange, 
          volume: newVolume,
          chartData: newChartData,
          rsi: newRSI
        };
      });
      
      // Update other assets
      this.forexRates = this.forexRates.map(r => ({
        ...r,
        rate: r.rate * (1 + (Math.random() - 0.5) * 0.005),
        change: (Math.random() - 0.5) * 0.005
      }));
      
      this.metals = this.metals.map(m => {
        const newPrice = m.price * (1 + (Math.random() - 0.5) * 0.01);
        return { ...m, price: newPrice, chartData: [...m.chartData.slice(1), newPrice] };
      });
      
      this.etfBonds = this.etfBonds.map(e => {
        const newPrice = e.price * (1 + (Math.random() - 0.5) * 0.01);
        return { ...e, price: newPrice, chartData: [...e.chartData.slice(1), newPrice] };
      });
      
      this.updateTopLists();
      this.notifications = this.notifications.slice(0, 6);
      this.updatePagination();
      this.updateMarketVolume();
    });
  }

  // TOP 5 GAGNANTS/PERDANTS
  updateTopLists(): void {
    const sorted = [...this.stockPrices].sort((a, b) => b.change - a.change);
    this.topGainers = sorted.slice(0, 5);
    this.topLosers = sorted.slice(-5).reverse();
  }

  // PAGINATION
  get paginatedStocks() {
    const filtered = this.stockPrices.filter(s => 
      s.symbol.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.updatePagination(filtered.length);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  get paginatedForex() {
    const filtered = this.forexRates.filter(r => 
      `${r.from}${r.to}`.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.updatePagination(filtered.length);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  get paginatedMetals() {
    const filtered = this.metals.filter(m => 
      m.symbol.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.updatePagination(filtered.length);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  get paginatedETFBonds() {
    const filtered = this.etfBonds.filter(e => 
      e.symbol.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.updatePagination(filtered.length);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  updatePagination(totalItems = 0) {
    this.totalPages = Math.ceil(totalItems / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages) || 1;
  }

  prevPage() { this.currentPage = Math.max(1, this.currentPage - 1); }
  nextPage() { this.currentPage = Math.min(this.totalPages, this.currentPage + 1); }

  updateMarketVolume() {
    const allPrices = [...this.stockPrices, ...this.metals, ...this.etfBonds];
    this.marketVolume = allPrices.reduce((sum, item) => sum + item.price * 1000, 0) / 1e9;
  }

  // 4 FONCTIONS COMPTAGE
  getCurrentCount(): number {
    switch (this.activeTab) {
      case 'stocks': return this.stockPrices.length;
      case 'forex': return this.forexRates.length;
      case 'metals': return this.metals.length;
      case 'etf-bond': return this.etfBonds.length;
      default: return 0;
    }
  }

  getCurrentTabName(): string {
    switch (this.activeTab) {
      case 'stocks': return 'ACTIONS';
      case 'forex': return 'DEVISES';
      case 'metals': return 'MÉTAUX';
      case 'etf-bond': return 'ETF';
      default: return '';
    }
  }

  getCurrentPageCount(): number {
    switch (this.activeTab) {
      case 'stocks': return this.paginatedStocks.length;
      case 'forex': return this.paginatedForex.length;
      case 'metals': return this.paginatedMetals.length;
      case 'etf-bond': return this.paginatedETFBonds.length;
      default: return 0;
    }
  }

  getTickerItems(): any[] {
    const forexForTicker = this.forexRates.map(r => ({
      symbol: `${r.from}/${r.to}`,
      price: r.rate,
      change: r.change * 10000
    }));
    return [...this.stockPrices.slice(0, 5), ...forexForTicker.slice(0, 3)];
  }

  goToDetails(symbol: string): void {
    this.router.navigate(['/asset-details', symbol]);
  }

  goToForexDetails(from: string, to: string): void {
    this.router.navigate(['/forex-details', from, to]);
  }
}