import { DefaultLayout } from './default-layout';
import { render } from '@testing-library/angular';

describe('Default Layout Template', () => {
  it('should create', async () => {
    const { fixture } = await render(DefaultLayout, {});
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });
});
