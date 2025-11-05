import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewsMarketComponent } from './news-market.component';

describe('NewsMarketComponent', () => {
  let component: NewsMarketComponent;
  let fixture: ComponentFixture<NewsMarketComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [NewsMarketComponent]
    });
    fixture = TestBed.createComponent(NewsMarketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
