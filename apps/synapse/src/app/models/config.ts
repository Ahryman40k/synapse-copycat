import { type InferOutput, object, string } from 'valibot';

export const ApplicationConfig = object({
	envName: string(),
});
export type ApplicationConfig = InferOutput<typeof ApplicationConfig>;
