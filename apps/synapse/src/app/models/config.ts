import { type InferOutput, literal, object, string, union } from 'valibot';

export const ApplicationConfig = object({
  envName: string(),
});
export type ApplicationConfig = InferOutput<typeof ApplicationConfig>;
