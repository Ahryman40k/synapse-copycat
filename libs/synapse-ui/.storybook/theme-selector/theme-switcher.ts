import { makeDecorator } from '@storybook/preview-api'

export const PARAM_KEY = 'backgrounds';

const switchTheme = (theme: string | undefined): void => {
  let themeLink = document.head.querySelector<HTMLLinkElement>(`link[rel="stylesheet"].app-theme`);

  if (!themeLink) {
    themeLink = document.createElement('link')
    themeLink.setAttribute('rel', 'stylesheet')
    themeLink.classList.add('app-theme')
    document.head.appendChild(themeLink)
  }

  if (themeLink) {
    themeLink.href = `assets/${theme ?? 'default_dark'}.css`;
  }
  console.log(themeLink)
}

export const withThemeSwitcher = makeDecorator({
  name: 'withThemeSwitcher',
  parameterName: 'theme',
  skipIfNoParametersOrOptions: false,
  wrapper: (storyFn, context, settings) => {
    console.log("custom decorator story", storyFn,)
    console.log("custom decorator context", context,)
    console.log("custom decorator settings", settings)

    const { globals, parameters } = context;
    const globalsBackgroundColor = globals[PARAM_KEY]?.value;
    const backgroundsConfig = parameters[PARAM_KEY];

    console.log('Notification', globalsBackgroundColor, backgroundsConfig)
    switchTheme(backgroundsConfig.values.find((b: any) => b.value === globalsBackgroundColor).name)

    return storyFn(context)
  }
})
