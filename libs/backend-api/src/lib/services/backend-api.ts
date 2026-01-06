import {
  type InvokeOptions,
  invoke as tauriInvoke,
} from '@tauri-apps/api/core';
import type { BackendCommands, Mock } from '../models';

export class BackendApiService {
  constructor(private readonly mock: Mock | undefined) {}

  invoke<
    C extends keyof BackendCommands,
    A extends BackendCommands[C]['args'],
    O extends BackendCommands[C]['options'] & InvokeOptions,
    R extends BackendCommands[C]['returnType']
  >(cmd: C, args: A, options?: O): Promise<R> {
    if (!this.mock) return tauriInvoke<R>(cmd, args, options);

    return new Promise<R>((resolve, reject) => {
      if (this.mock?.[cmd]) {
        const result = this.mock[cmd] as R;
        resolve(result);
        return;
      }

      reject(new Error('Mocked backend call failed'));
    });
  }
}
