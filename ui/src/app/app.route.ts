import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { AuthComponent } from './auth/auth.component';
import { LocationSelectorComponent } from './location-selector/location-selector.component';

export const routes: Routes = [
    { path: 'login', component: AuthComponent },
    { path: '', component: LocationSelectorComponent, canActivate: [authGuard] },
];