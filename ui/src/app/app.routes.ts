import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { AuthComponent } from './auth/auth.component';
import { LocationSelectorComponent } from './location-selector/location-selector.component';
import { DriverListComponent } from './driver/driver-list.component';
import { DriverTrackComponent } from './driver/driver-track.component';
import { AdminUsersComponent } from './admin/admin-users.component';
import { adminGuard } from './admin/admin.guard';
import { AdminOrdersComponent } from './admin/admin-orders.component';
export const routes: Routes = [
    { path: 'login', component: AuthComponent },
    { path: 'driver', component: DriverListComponent, canActivate: [authGuard] },
    { path: 'admin', component: AdminUsersComponent, canActivate: [authGuard, adminGuard] },
    { path: 'admin/orders', component: AdminOrdersComponent, canActivate: [authGuard, adminGuard] },
    { path: 'driver/track/:orderId', component: DriverTrackComponent, canActivate: [authGuard] },
    { path: '', component: LocationSelectorComponent, canActivate: [authGuard] },
];