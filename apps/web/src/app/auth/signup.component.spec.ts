import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  let fixture: ComponentFixture<SignupComponent>;
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    fixture = TestBed.createComponent(SignupComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  function setInput(selector: string, value: string): void {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('requires a password of at least 8 characters', () => {
    setInput('input[formControlName="email"]', 'test@example.com');
    setInput('input[formControlName="password"]', 'short');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    httpTesting.expectNone('/api/auth/signup');
    expect(fixture.nativeElement.textContent).toContain('Almeno 8 caratteri.');
  });

  it('signs up and navigates to the root route', () => {
    setInput('input[formControlName="email"]', 'test@example.com');
    setInput('input[formControlName="password"]', 'password1234');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    const request = httpTesting.expectOne('/api/auth/signup');
    expect(request.request.body).toEqual({ email: 'test@example.com', password: 'password1234' });
    request.flush({
      accessToken: 'token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', email: 'test@example.com' },
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows an error message when the email is already registered', () => {
    setInput('input[formControlName="email"]', 'test@example.com');
    setInput('input[formControlName="password"]', 'password1234');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    httpTesting
      .expectOne('/api/auth/signup')
      .flush(
        { message: 'An account with this email already exists.' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('An account with this email already exists.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
