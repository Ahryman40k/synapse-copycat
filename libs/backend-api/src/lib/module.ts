import {
	type EnvironmentProviders,
	InjectionToken,
	makeEnvironmentProviders,
	type Provider,
} from "@angular/core";
import type { Mock } from "./models";
import { BackendApiService } from "./services/backend-api";

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

export const BackendApi = new InjectionToken<BackendApiService>("BackendApi");
export type WithMock = MockFeature<MockFeatureKind.withMocks>;

export function withMock(mock: Mock): WithMock {
	const providers = [
		{
			provide: BackendApi,
			useValue: new BackendApiService(mock),
		},
	] satisfies (Provider | EnvironmentProviders)[];
	return mockFeature(MockFeatureKind.withMocks, providers);
}

//------------------------------------------------------------

export function provideBackendApi(
	...features: MockFeatures[]
): EnvironmentProviders {
	return makeEnvironmentProviders([
		features.map((feature) => feature.providers),
	]);
}
