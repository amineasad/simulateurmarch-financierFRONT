import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffresEmploiComponent } from './offres-emploi.component';

describe('OffresEmploiComponent', () => {
  let component: OffresEmploiComponent;
  let fixture: ComponentFixture<OffresEmploiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OffresEmploiComponent]
    });
    fixture = TestBed.createComponent(OffresEmploiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
