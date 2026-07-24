import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from './auth/auth.service';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
  });

  afterEach(() => localStorage.clear());

  it('hides the session bar when not authenticated', () => {
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.session-bar')).toBeNull();
  });

  it('shows the current user and logs out on click', () => {
    localStorage.setItem(
      'marketplace-hub.auth',
      JSON.stringify({
        accessToken: 'token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1', email: 'me@example.com' },
      }),
    );
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('me@example.com');

    (fixture.nativeElement.querySelector('.session-bar button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(fixture.nativeElement.querySelector('.session-bar')).toBeNull();
  });
});
