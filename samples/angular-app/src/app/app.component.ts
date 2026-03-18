import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent {
  title = 'Research & Fund Management';
  sidenavOpened = true;

  navItems = [
    { label: 'Company Research', icon: 'search', route: '/research' },
    { label: 'Fund Overview', icon: 'account_balance', route: '/funds' },
    { label: 'Holdings Grid', icon: 'grid_on', route: '/holdings' },
  ];

  constructor(private router: Router) {
    console.log('AppComponent initialized');
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  toggleSidenav(): void {
    this.sidenavOpened = !this.sidenavOpened;
  }
}
