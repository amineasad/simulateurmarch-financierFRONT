import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';

export interface RealMarketNews {
  title: string;
  summary: string;
  date: string;
  source: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  url: string;
  category: 'live' | 'financial' | 'geopolitical' | 'political';
  recommendations: { asset: string; advice: 'ACHAT' | 'VENTE' | 'NEUTRE' }[];
}

@Component({
  selector: 'app-news-market',
  templateUrl: './news-market.component.html',
  styleUrls: ['./news-market.component.css']
})
export class NewsMarketComponent implements OnInit, OnDestroy {
  news: RealMarketNews[] = [];
  filter: 'all' | 'bullish' | 'bearish' | 'high' | 'live' | 'geopolitical' | 'financial' | 'political' = 'all';
  private subscription: Subscription = new Subscription();
  loading = true;

  private apiKey = '5a17100b714c4cb2a51c9c10251c96cd';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadRealTimeNews();
    this.subscription.add(interval(300000).subscribe(() => this.loadRealTimeNews()));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadRealTimeNews(): void {
    this.loading = true;
    const url = `https://newsapi.org/v2/everything?q=stock+market+OR+trading+OR+finance+OR+economy&apiKey=${this.apiKey}&sortBy=publishedAt&pageSize=20&language=en`;
    
    this.http.get<any>(url).subscribe({
      next: (response) => {
        console.log('✅ IA INTELLIGENTE OK :', response.articles.length, 'news analysées');
        this.news = response.articles.map((article: any) => this.mapToMarketNews(article));
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ API Error:', error);
        this.loadFallbackNews();
        this.loading = false;
      }
    });
  }

  private mapToMarketNews(article: any): RealMarketNews {
    const title = article.title;
    const summary = article.description || 'Pas de résumé disponible';
    const date = new Date(article.publishedAt).toLocaleString('fr-FR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    const source = article.source.name;
    const url = article.url;
    const text = title + ' ' + summary;

    // 🔥 IA INTELLIGENTE : RECOS UNIQUES PAR ARTICLE
    const recommendations = this.analyzeRecommendations(text, title);

    return { 
      title, summary, date, source, url,
      sentiment: this.analyzeSentiment(text),
      impact: this.analyzeImpact(title),
      category: this.analyzeCategory(title),
      recommendations
    };
  }

  // 🔥 IA INTELLIGENTE : 3-5 ACTIFS UNIQUES PAR ARTICLE
  private analyzeRecommendations(text: string, title: string): { asset: string; advice: 'ACHAT' | 'VENTE' | 'NEUTRE' }[] {
    const recos: { asset: string; advice: 'ACHAT' | 'VENTE' | 'NEUTRE' }[] = [];
    const lowerTitle = title.toLowerCase();
    
    // 1. DÉTECTION INTELLIGENTE PAR MOTS-CLÉS
    if (lowerTitle.includes('walmart') || lowerTitle.includes('retail')) {
      recos.push({ asset: 'WMT', advice: 'VENTE' });
      recos.push({ asset: 'SPY', advice: 'NEUTRE' });
      recos.push({ asset: 'XRT', advice: 'VENTE' });
    }
    
    if (lowerTitle.includes('corporate') || lowerTitle.includes('america') || lowerTitle.includes('crushing')) {
      recos.push({ asset: 'SPY', advice: 'ACHAT' });
      recos.push({ asset: 'DIA', advice: 'ACHAT' });
      recos.push({ asset: 'XLF', advice: 'ACHAT' });
      recos.push({ asset: 'IWM', advice: 'ACHAT' });
    }
    
    if (lowerTitle.includes('trump') || lowerTitle.includes('policy') || lowerTitle.includes('justice')) {
      recos.push({ asset: 'SPY', advice: 'ACHAT' });
      recos.push({ asset: 'TLT', advice: 'VENTE' });
      recos.push({ asset: 'XAUUSD', advice: 'ACHAT' });
      recos.push({ asset: 'USOIL', advice: 'ACHAT' });
    }
    
    if (lowerTitle.includes('tech') || lowerTitle.includes('rally')) {
      recos.push({ asset: 'QQQ', advice: 'ACHAT' });
      recos.push({ asset: 'AAPL', advice: 'ACHAT' });
      recos.push({ asset: 'NVDA', advice: 'ACHAT' });
      recos.push({ asset: 'MSFT', advice: 'ACHAT' });
    }
    
    if (lowerTitle.includes('jobs') || lowerTitle.includes('employment') || lowerTitle.includes('visa')) {
      recos.push({ asset: 'SPY', advice: 'ACHAT' });
      recos.push({ asset: 'IWM', advice: 'ACHAT' });
      recos.push({ asset: 'XLI', advice: 'ACHAT' });
    }

    if (lowerTitle.includes('stock') || lowerTitle.includes('market')) {
      recos.push({ asset: 'SPY', advice: 'ACHAT' });
      recos.push({ asset: 'QQQ', advice: 'ACHAT' });
    }

    // 2. SENTIMENT GÉNÉRAL → COMPLÉMENT
    const sentiment = this.analyzeSentiment(text);
    if (recos.length < 3) {
      if (sentiment === 'bullish') {
        recos.push({ asset: 'SPY', advice: 'ACHAT' });
        recos.push({ asset: 'QQQ', advice: 'ACHAT' });
      } else if (sentiment === 'bearish') {
        recos.push({ asset: 'SPY', advice: 'VENTE' });
        recos.push({ asset: 'TLT', advice: 'ACHAT' });
      } else {
        recos.push({ asset: 'SPY', advice: 'NEUTRE' });
        recos.push({ asset: 'QQQ', advice: 'NEUTRE' });
      }
    }

    // 3. MAX 5 ACTIFS UNIQUES
    return recos.slice(0, 5);
  }

  private analyzeSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
    const bullish = ['rise', 'gain', 'up', 'bull', 'profit', 'surge', 'rally', 'boom', 'growth', 'beat', 'crushing'];
    const bearish = ['fall', 'drop', 'down', 'bear', 'loss', 'crash', 'decline', 'slump', 'cut', 'miss', 'halts'];
    
    const lower = text.toLowerCase();
    const bullCount = bullish.filter(w => lower.includes(w)).length;
    const bearCount = bearish.filter(w => lower.includes(w)).length;

    return bullCount > bearCount ? 'bullish' : bearCount > bullCount ? 'bearish' : 'neutral';
  }

  private analyzeImpact(title: string): 'high' | 'medium' | 'low' {
    const high = ['fed', 'trump', 'china', 'war', 'crash', 'recession', 'inflation', 'oil', 'rate', 'gdp'];
    const medium = ['earnings', 'profit', 'sales', 'jobs', 'results'];
    
    const lower = title.toLowerCase();
    return high.some(w => lower.includes(w)) ? 'high' : medium.some(w => lower.includes(w)) ? 'medium' : 'low';
  }

  private analyzeCategory(title: string): 'live' | 'financial' | 'geopolitical' | 'political' {
    const live = ['now', 'breaking', 'latest', 'update', 'live'];
    const financial = ['stock', 'market', 'earnings', 'profit'];
    const geo = ['china', 'russia', 'war', 'trade', 'oil'];
    const political = ['trump', 'fed', 'congress', 'policy', 'election', 'justice'];

    const lower = title.toLowerCase();
    return live.some(w => lower.includes(w)) ? 'live' : 
           financial.some(w => lower.includes(w)) ? 'financial' : 
           geo.some(w => lower.includes(w)) ? 'geopolitical' : 
           political.some(w => lower.includes(w)) ? 'political' : 'financial';
  }

  loadFallbackNews(): void {
    this.news = [{
      title: "Market Update",
      summary: "Latest financial news summary.",
      date: new Date().toLocaleString('fr-FR'),
      source: "Fallback",
      sentiment: 'neutral',
      impact: 'medium',
      url: "https://example.com",
      category: 'financial',
      recommendations: [
        { asset: 'SPY', advice: 'NEUTRE' },
        { asset: 'QQQ', advice: 'NEUTRE' }
      ]
    }];
  }

  // GETTERS
  get bullishCount(): number { return this.getBullishNews().length; }
  get bearishCount(): number { return this.getBearishNews().length; }
  get highImpactCount(): number { return this.getHighImpactNews().length; }
  get liveCount(): number { return this.news.filter(n => n.category === 'live').length; }

  getFilteredNews(): RealMarketNews[] {
    let filtered = this.news;
    switch (this.filter) {
      case 'bullish': filtered = this.getBullishNews(); break;
      case 'bearish': filtered = this.getBearishNews(); break;
      case 'high': filtered = this.getHighImpactNews(); break;
      case 'live': filtered = this.news.filter(n => n.category === 'live'); break;
      case 'geopolitical': filtered = this.news.filter(n => n.category === 'geopolitical'); break;
      case 'financial': filtered = this.news.filter(n => n.category === 'financial'); break;
      case 'political': filtered = this.news.filter(n => n.category === 'political'); break;
    }
    return filtered.slice(0, 10);
  }

  getBullishNews(): RealMarketNews[] { return this.news.filter(n => n.sentiment === 'bullish'); }
  getBearishNews(): RealMarketNews[] { return this.news.filter(n => n.sentiment === 'bearish'); }
  getHighImpactNews(): RealMarketNews[] { return this.news.filter(n => n.impact === 'high'); }

  getTradingAdvice(news: RealMarketNews): string {
    if (news.sentiment === 'bullish') return 'ACHAT RECOMMANDÉ';
    if (news.sentiment === 'bearish') return 'VENTE RECOMMANDÉE';
    return 'NEUTRE - OBSERVER';
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      live: '⚡', financial: '💰', geopolitical: '🌍', political: '🏛️'
    };
    return icons[category] || '📊';
  }

  openNews(url: string): void {
    window.open(url, '_blank');
  }
}