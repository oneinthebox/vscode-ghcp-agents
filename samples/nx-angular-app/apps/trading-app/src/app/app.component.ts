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
  appTitle = 'TRADING DESK';
  navLinks = [
    { label: 'Order Entry', path: '/order-entry' },
    { label: 'Blotter', path: '/blotter' },
    { label: 'Market Data', path: '/market-data' },
  ];
}
