import type { Meta, StoryObj } from '@storybook/angular';
import type { Device, Module } from '@synapse-copycat/backend-api';
import { fn } from 'storybook/test';
import { AppBar } from './appbar';

const meta: Meta<AppBar> = {
	component: AppBar,
	title: 'Synapse application / Components / Application Bar',
	args: {
		deviceActivated: fn(),
		moduleActivated: fn(),
		homeRequested: fn(),
	},
};

export default meta;
type Story = StoryObj<AppBar>;

const devices = [
	{
		__type: 'device',
		kind: 'mouse',
		name: 'Razer Basilisk Ultimate',
		id: '5426-0136',
		visual: 'assets/devices/5426-0136.png',
	},
	{
		__type: 'device',
		kind: 'accessory',
		name: 'Razer Basilisk Ultimate (dock)',
		id: '5426-0126',
		visual: 'assets/devices/5426-0126.png',
	},
	{
		__type: 'device',
		kind: 'keyboard',
		name: 'Razer Huntsman elite',
		id: '5426-0550',
		visual: 'assets/devices/5426-0550.png',
	},
	{
		__type: 'device',
		kind: 'mousemat',
		name: 'Razer Goliathus',
		id: '5426-3074',
		visual: 'assets/devices/5426-3074.png',
	},
	{
		__type: 'device',
		kind: 'streaming',
		name: 'Razer Kiyo',
		id: '5426-3587',
		visual: 'assets/devices/5426-3587.png',
	},
] satisfies Device[];

const modules = [
	{
		__type: 'module',
		name: 'Twinkly',
		kind: 'twinkly',
		visual: 'assets/modules/twinkly.png',
	},
	{
		__type: 'module',
		name: 'Goove',
		kind: 'goove',
		visual: 'assets/modules/goove.png',
	},
] satisfies Module[];

export const Default: Story = {
	name: 'Default Bar',
	args: {
		devices: [],
		modules: [],
	},
};

export const DeviceOnly = {
	name: 'With only devices',
	args: {
		devices,
		modules: [],
	},
};

export const moduleOnly = {
	name: 'With only modules',
	args: {
		devices: [],
		modules,
	},
};

export const All = {
	name: 'Full bar',
	args: {
		devices,
		modules,
	},
};
