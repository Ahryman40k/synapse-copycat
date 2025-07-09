import { InjectionToken } from "@angular/core";
import { Observable } from "rxjs";
import { Device } from "../models";

export interface DeviceServiceContract {
	discover(): Observable<Device[]>;
}

export const DeviceService = new InjectionToken<DeviceServiceContract>(
	"DeviceService",
);
