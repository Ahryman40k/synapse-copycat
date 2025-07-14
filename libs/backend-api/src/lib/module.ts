import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
	EnvironmentProviders,
	InjectionToken,
	Provider,
	makeEnvironmentProviders,
} from "@angular/core";
// import { invoke } from "@tauri-apps/api";

// Helper function to provide Feature object
function mockFeature<FeatureKind extends MockFeatureKind>(
	kind: FeatureKind,
	providers: (Provider | EnvironmentProviders)[],
): MockFeature<FeatureKind> {
	return { kind, providers };
}

// All possible feature can be added here
export enum MockFeatureKind {
	withMocks = 0,
}

// All feature type can be concatenated here A | B | C ...
export type MockFeatures = WithMock;

export interface MockFeature<FeatureKind extends MockFeatureKind> {
	kind: FeatureKind;
	providers: (Provider | EnvironmentProviders)[];
}

//------------------------------------------------------------

export type WithMock = MockFeature<MockFeatureKind.withMocks>;

export function withMock(mock: any): WithMock {
	const providers = [
		{
			provide: BackendApi,
			useValue: new BackendApiService(mock),
		},
	] satisfies (Provider | EnvironmentProviders)[];
	return mockFeature(MockFeatureKind.withMocks, providers);
}

//------------------------------------------------------------

export const BackendApi = new InjectionToken<BackendApiService>("BackendApi");

export type Device = {
	__type: "device";
	kind: "mouse" | "keyboard" | "mousemat" | "streaming" | "accessory";
	visual: string;
	id: string;
	name: string;
};

export type Module = {
	__type: "module";
	kind: "twinky" | "goove" | "nanoleaf";
	name: "Twinkly" | "Goove" | "Nanoleaf";
	visual: string;
};

export type BackendCommands = {
	devices: {
		args: {};
		options: {};
		returnType: Device[];
	};
	modules: {
		args: {};
		options: {};
		returnType: Module[];
	};
};

export type Mock = {
	[K in keyof BackendCommands]: BackendCommands[K]["returnType"];
};

class BackendApiService {
	constructor(private readonly mock: Mock | undefined) {}

	invoke<
		C extends keyof BackendCommands,
		A extends BackendCommands[C]["args"],
		O extends BackendCommands[C]["options"],
		R extends BackendCommands[C]["returnType"],
	>(cmd: C, args: A, options?: O): Promise<R> {
		// if (!this.mock) return tauriInvoke<R>(cmd, args, options);

		return new Promise<R>((resolve, reject) => {
			const result = this.mock![cmd] as R;

			if (result) {
				resolve(result);
			}

			reject("Mocked backend call failed");
		});
	}
}

//------------------------------------------------------------

export function provideBackendApi(
	...features: MockFeatures[]
): EnvironmentProviders {
	return makeEnvironmentProviders([
		features.map((feature) => feature.providers),
	]);
}
