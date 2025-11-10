// src/app/components/session-order-book/session-order-book.component.ts
import { Component, Input } from '@angular/core';
import { SessionOrderBookDepth, SessionOrderBookEntry } from '../../models/market.model';

@Component({
  selector: 'app-session-order-book',
  templateUrl: './session-order-book.component.html',
  styleUrls: ['./session-order-book.component.css']
})
export class SessionOrderBookComponent {
  @Input() depth?: SessionOrderBookDepth;

  trackByPrice = (_: number, lvl: SessionOrderBookEntry) => lvl.price;

  // Calcul du volume total pour la barre de profondeur
  getBidMaxQty(): number {
    if (!this.depth?.bids?.length) return 1;
    return Math.max(...this.depth.bids.map(b => b.quantity), 1);
  }

  getAskMaxQty(): number {
    if (!this.depth?.asks?.length) return 1;
    return Math.max(...this.depth.asks.map(a => a.quantity), 1);
  }

  getBidWidth(qty: number): number {
    const max = this.getBidMaxQty();
    return (qty / max) * 100;
  }

  getAskWidth(qty: number): number {
    const max = this.getAskMaxQty();
    return (qty / max) * 100;
  }
}
