export type Module = {
	__type: 'module';
	kind: 'twinkly' | 'goove' | 'nanoleaf';
	name: string;
	visual: string;
};
