import { setCompodocJson } from '@storybook/addon-docs/angular';
import docJson from '../documentation.json';
setCompodocJson(docJson);

import '!style-loader!css-loader!sass-loader!../src/styles.scss';
import { Preview } from '@storybook/angular';

const preview: Preview = {};

export default preview;
