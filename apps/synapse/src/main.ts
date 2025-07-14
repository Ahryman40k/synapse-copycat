import { bootstrapApplication } from '@angular/platform-browser';
import { safeParse } from 'valibot';
import { App } from './app/app';
import { makeAppConfig } from './app/app.config';
import { ApplicationConfig } from './app/models/config';

fetch('/config/app.json')
  .then((res) => res.json())
  .then((maybeConfig: any) => {
    const validation = safeParse(ApplicationConfig, maybeConfig);
    if (validation.success) {
      bootstrapApplication(App, makeAppConfig(validation.output)).catch((err) =>
        console.error(err)
      );
    } else {
      console.error('APPLICATION CONFIG NOT FOUND');
    }
  });
// bootstrapApplication(App, appConfig).catch((err) => console.error(err));
