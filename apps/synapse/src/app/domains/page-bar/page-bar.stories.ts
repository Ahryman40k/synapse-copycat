import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { PageBarComponent, PageBarDescriptor } from './page-bar';
import { Component } from '@angular/core';

@Component({
  selector: 'test1-component',
  template: `
  <span>test 1</span>
`,
})
export class TestComponent1 { }

@Component({
  selector: 'test2-component',
  template: `
  <span>test 2/span>
`,
})
export class TestComponent2 { }

const meta: Meta<PageBarComponent> = {
  component: PageBarComponent,
  title: 'Synapse Application / Components / Page Bar',
  decorators: [
    moduleMetadata({
      imports: [TestComponent1, TestComponent2],
    }),
  ],
};
export default meta;

type Story = StoryObj<PageBarComponent>;

export const Default: Story = {
  args: {
    descriptor: [
      {
        title: 'action1',
        component: TestComponent1,
      },
      {
        title: 'action2',
        component: TestComponent2,
      },
    ] satisfies PageBarDescriptor,
  },
};
