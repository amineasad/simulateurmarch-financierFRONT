import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { WebsocketService } from '../../services/websocket.service';
import { OrderBookLevel, OrderBookSnapshot } from '../../models/models';
import { Subscription } from 'rxjs';
import { OrdersApi } from '../../services/orders.api';

@Component({
  selector: 'app-orderbook',
  templateUrl: './orderbook.component.html',
  styleUrls: ['./orderbook.component.css']
})
export class OrderbookComponent implements OnInit, OnDestroy {
  @Input() assetId: number = 1;
  @Input() depth: number = 10;

  snapshot: OrderBookSnapshot | null = null;
  bids: OrderBookLevel[] = [];
  asks: OrderBookLevel[] = [];

  private sub?: Subscription;

  constructor(private ws: WebsocketService, private ordersApi: OrdersApi) {}

  ngOnInit(): void {
    // 1) Snapshot initial via HTTP pour affichage immédiat
    this.ordersApi.getOrderBookSnapshot(this.assetId).subscribe((snap: any) => {
      this.applySnapshot(snap as OrderBookSnapshot);
    });

    // 2) Mises à jour temps réel via WebSocket
    this.sub = this.ws
      .subscribe<OrderBookSnapshot>(`/topic/orderbook/${this.assetId}`)
      .subscribe((snap) => this.applySnapshot(snap));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private applySnapshot(snap: OrderBookSnapshot) {
    this.snapshot = snap;
    this.bids = [...(snap.bids || [])]
      .sort((a, b) => b.price - a.price)
      .slice(0, this.depth);
    this.asks = [...(snap.asks || [])]
      .sort((a, b) => a.price - b.price)
      .slice(0, this.depth);
  }
}

