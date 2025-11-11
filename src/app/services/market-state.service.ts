import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WebsocketService } from './websocket.service';
import { environment } from '../../environments/environment';

export type MarketState = 'OPEN' | 'HALTED' | 'CLOSED';

@Injectable({ providedIn: 'root' })
export class MarketStateService {
  private stateByAsset = new Map<number, BehaviorSubject<MarketState>>();

  constructor(private ws: WebsocketService) {}

  getState$(assetId: number = environment.DEFAULT_ASSET_ID): Observable<MarketState> {
    let subject = this.stateByAsset.get(assetId);
    if (!subject) {
      subject = new BehaviorSubject<MarketState>('OPEN');
      this.stateByAsset.set(assetId, subject);
      // S'abonner au topic WS
      this.ws.subscribe<any>(`/topic/marketstate/${assetId}`).subscribe((msg) => {
        const state = (msg?.state as MarketState) || 'OPEN';
        subject!.next(state);
      });
    }
    return subject.asObservable();
  }
}


