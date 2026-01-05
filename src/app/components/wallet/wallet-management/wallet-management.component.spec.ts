import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletManagementComponent } from './wallet-management.component';

describe('WalletManagementComponent', () => {
  let component: WalletManagementComponent;
  let fixture: ComponentFixture<WalletManagementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WalletManagementComponent]
    });
    fixture = TestBed.createComponent(WalletManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
