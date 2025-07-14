import type { BackendCommands, Mock } from "../models";

export class BackendApiService {
	constructor(private readonly mock: Mock | undefined) {}

	invoke<
		C extends keyof BackendCommands,
		A extends BackendCommands[C]["args"],
		O extends BackendCommands[C]["options"],
		R extends BackendCommands[C]["returnType"],
	>(cmd: C, args: A, options?: O): Promise<R> {
		// if (!this.mock) return tauriInvoke<R>(cmd, args, options);

		return new Promise<R>((resolve, reject) => {
			const result = this.mock?.[cmd] as R;

			if (result) {
				resolve(result);
			}

			reject("Mocked backend call failed");
		});
	}
}
