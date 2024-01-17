import { setCompodocJson } from '@storybook/addon-docs/angular';
import docJson from '../documentation.json';
setCompodocJson(docJson);

import '!style-loader!css-loader!sass-loader!./style-loader.scss';

import type { Preview } from '@storybook/angular';
import { withThemeByClassName } from '@storybook/addon-styling';

// const preview: Preview = {};
// export default preview;

const themeClasses = ['razer-green', 'razer-orange' ];
export default {
    decorators: [
      withThemeByClassName({
        themes: themeClasses.reduce((obj, value) => ({ ...obj, [value]: `${value}` }), {}),
        defaultTheme: themeClasses[0]
      })
    ],
    // parameters: {
    //   actions: { argTypesRegex: "^on[A-Z].*" }
    // }
  } satisfies Preview;