import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    loadChildren: () =>
      import('./pages/default-layout/default-layout.component').then(
        (m) => m.routes
      ),
    providers: [   ],
  },
  
];
