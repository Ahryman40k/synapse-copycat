import { setCompodocJson } from '@storybook/addon-docs/angular';
import docJson from '../documentation.json';
setCompodocJson(docJson);

import '!style-loader!css-loader!sass-loader!./style-loader.scss';

// import type { Preview } from '@storybook/angular';
import { withThemeByClassName } from '@storybook/addon-themes';


export default {
    decorators: [
      withThemeByClassName({
        themes: {
          orange: 'razer-orange',
          default: 'razer-green',
        },
        defaultTheme: 'default'
      })
    ],
    // parameters: {
    //   actions: { argTypesRegex: "^on[A-Z].*" }
    // }

  } /* satisfies Preview */;