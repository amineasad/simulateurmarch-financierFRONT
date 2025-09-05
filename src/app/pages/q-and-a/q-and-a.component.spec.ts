import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QAndAComponent } from './q-and-a.component';

describe('QAndAComponent', () => {
  let component: QAndAComponent;
  let fixture: ComponentFixture<QAndAComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QAndAComponent]
    });
    fixture = TestBed.createComponent(QAndAComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
