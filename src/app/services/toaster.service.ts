import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastLevel = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  level: ToastLevel;
  message: string;
  ts: number;
}

@Injectable({ providedIn: 'root' })
export class ToasterService {
  private stream = new Subject<Toast>();
  toasts$ = this.stream.asObservable();

  show(level: ToastLevel, message: string) {
    this.stream.next({ level, message, ts: Date.now() });
  }
}
