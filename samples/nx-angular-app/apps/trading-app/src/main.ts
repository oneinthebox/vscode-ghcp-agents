import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';
import { appRoutes } from './app/app.routes';
import { OrderEntryModule } from './app/order-entry/order-entry.module';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(appRoutes, withComponentInputBinding()),
    // Import the NgModule-based OrderEntryModule for its declarations
    importProvidersFrom(OrderEntryModule),
  ],
}).catch((err) => console.error(err));
