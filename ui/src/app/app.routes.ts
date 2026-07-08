import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { AuthComponent } from './auth/auth.component';
import { LocationSelectorComponent } from './location-selector/location-selector.component';
import { DriverListComponent } from './driver/driver-list.component';
import { DriverTrackComponent } from './driver/driver-track.component';
import { AdminUsersComponent } from './admin/admin-users.component';
import { adminGuard } from './admin/admin.guard';
import { AdminOrdersComponent } from './admin/admin-orders.component';
import { driverGuard } from './driver/driver.guard';
export const routes: Routes = [
    { path: 'login', component: AuthComponent },
    { path: 'admin', component: AdminUsersComponent, canActivate: [authGuard, adminGuard] },
    { path: 'admin/orders', component: AdminOrdersComponent, canActivate: [authGuard, adminGuard] },
    { path: 'driver', component: DriverListComponent, canActivate: [authGuard, driverGuard] },
    { path: 'driver/track/:orderId', component: DriverTrackComponent, canActivate: [authGuard, driverGuard] },
    { path: '', component: LocationSelectorComponent, canActivate: [authGuard] },
];