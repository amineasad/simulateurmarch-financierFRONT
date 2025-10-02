import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PriceChartComponent } from './price-chart.component';

describe('PriceChartComponent', () => {
  let component: PriceChartComponent;
  let fixture: ComponentFixture<PriceChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PriceChartComponent]
    });
    fixture = TestBed.createComponent(PriceChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
