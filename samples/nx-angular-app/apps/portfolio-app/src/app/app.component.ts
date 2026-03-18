import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '@fintech/shared-ui';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, HeaderComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  appTitle = 'PORTFOLIO MGMT';
  navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Holdings', path: '/holdings' },
    { label: 'Allocation', path: '/allocation' },
  ];
}
