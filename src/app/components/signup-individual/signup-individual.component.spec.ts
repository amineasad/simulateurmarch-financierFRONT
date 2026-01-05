import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignupIndividualComponent } from './signup-individual.component';

describe('SignupIndividualComponent', () => {
  let component: SignupIndividualComponent;
  let fixture: ComponentFixture<SignupIndividualComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SignupIndividualComponent]
    });
    fixture = TestBed.createComponent(SignupIndividualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
