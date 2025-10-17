import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignupChoiceComponent } from './signup-choice.component';

describe('SignupChoiceComponent', () => {
  let component: SignupChoiceComponent;
  let fixture: ComponentFixture<SignupChoiceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SignupChoiceComponent]
    });
    fixture = TestBed.createComponent(SignupChoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
