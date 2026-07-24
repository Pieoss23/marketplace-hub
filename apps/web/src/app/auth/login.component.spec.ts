import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let httpTesting: HttpTestingController;
  let router: Router;

  function configure(returnUrl: string | null): void {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) },
          },
        },
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  }

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  function setInput(selector: string, value: string): void {
    const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('shows validation hints and does not submit an invalid form', () => {
    configure(null);
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    httpTesting.expectNone('/api/auth/login');
    expect(fixture.nativeElement.textContent).toContain('Inserisci un indirizzo email valido.');
  });

  it('logs in and navigates to / by default', () => {
    configure(null);
    setInput('input[formControlName="email"]', 'test@example.com');
    setInput('input[formControlName="password"]', 'password1234');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    const request = httpTesting.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ email: 'test@example.com', password: 'password1234' });
    request.flush({
      accessToken: 'token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', email: 'test@example.com' },
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('navigates to the returnUrl query param after login', () => {
    configure('/?announcementId=abc');
    setInput('input[formControlName="email"]', 'test@example.com');
    setInput('input[formControlName="password"]', 'password1234');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    httpTesting
      .expectOne('/api/auth/login')
      .flush({ accessToken: 'token', user: { id: 'user-1', email: 'test@example.com' } });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/?announcementId=abc');
  });

  it('shows an error message when login fails', () => {
    configure(null);
    setInput('input[formControlName="email"]', 'test@example.com');
    setInput('input[formControlName="password"]', 'wrong-password');
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    httpTesting
      .expectOne('/api/auth/login')
      .flush({ message: 'Email or password is incorrect.' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Email or password is incorrect.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
