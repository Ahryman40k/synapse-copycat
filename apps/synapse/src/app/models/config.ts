import { object, union, literal, InferOutput, string } from "valibot";

export const ApplicationConfig = object({
	envName: string(),
	envType: union([literal("local"), literal("remote")]),
});
export type ApplicationConfig = InferOutput<typeof ApplicationConfig>;
