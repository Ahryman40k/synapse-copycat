import { render } from '@testing-library/angular';
import { DefaultLayout } from './default-layout';

describe('Default Layout Template', () => {
  it('should create', async () => {
    const { fixture } = await render(DefaultLayout, {});
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });
});
