import { Component } from '@angular/core';
import { LocationSelectorComponent } from './location-selector/location-selector.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LocationSelectorComponent],
  template: `<app-location-selector></app-location-selector>`,
  styles: [`:host { display: block; height: 100vh; }`]
})
export class AppComponent {}
