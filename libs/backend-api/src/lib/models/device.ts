export type Device = {
	__type: 'device';
	kind: 'mouse' | 'keyboard' | 'mousemat' | 'streaming' | 'accessory';
	visual: string;
	id: string;
	name: string;
};
