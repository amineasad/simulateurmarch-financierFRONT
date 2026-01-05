import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignupStudentComponent } from './signup-student.component';

describe('SignupStudentComponent', () => {
  let component: SignupStudentComponent;
  let fixture: ComponentFixture<SignupStudentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SignupStudentComponent]
    });
    fixture = TestBed.createComponent(SignupStudentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
