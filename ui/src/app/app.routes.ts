import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { AuthComponent } from './auth/auth.component';
import { LocationSelectorComponent } from './location-selector/location-selector.component';
import { DriverListComponent } from './driver/driver-list.component';
export const routes: Routes = [
    { path: 'login', component: AuthComponent },
    { path: 'driver', component: DriverListComponent, canActivate: [authGuard] },
    { path: '', component: LocationSelectorComponent, canActivate: [authGuard] },
];