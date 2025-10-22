import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountOpeningIntroComponent } from './account-opening-intro.component';

describe('AccountOpeningIntroComponent', () => {
  let component: AccountOpeningIntroComponent;
  let fixture: ComponentFixture<AccountOpeningIntroComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountOpeningIntroComponent]
    });
    fixture = TestBed.createComponent(AccountOpeningIntroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
