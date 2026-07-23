import { Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login.component';
import { SignupComponent } from './auth/signup.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: '', component: AppComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
