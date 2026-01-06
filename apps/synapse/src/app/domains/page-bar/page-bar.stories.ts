import { Component } from '@angular/core';
import { type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';
import { PageBarComponent, type PageBarDescriptor } from './page-bar';

@Component({
  selector: 'test1-component',
  template: ` <span>test 1</span> `,
})
export class TestComponent1 {}

@Component({
  selector: 'test2-component',
  template: ` <span>test 2/span> </span> `,
})
export class TestComponent2 {}

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
