import { delay, Observable, of } from "rxjs";
import { Device } from "../models";
import { DeviceServiceContract } from "./device-service-token";

const connected: Device[] = [
	{
		__type: "device",
		group: "connected",
		kind: "twinkly",
		name: "Twinkly",
		visual: "assets/devices/twinkly.png",
	},
	{
		__type: "device",
		group: "connected",
		kind: "goove",
		name: "Govee",
		visual: "assets/images/razer-logo.svg",
	},
	{
		__type: "device",
		group: "connected",
		kind: "nanoleaf",
		name: "Nanoleaf",
		visual: "assets/images/razer-logo.svg",
	},
];

const devices: Device[] = [
	{
		__type: "device",
		group: "usb",
		id: "126",
		kind: "accessory",
		name: "Mouse dock",
		visual: "assets/devices/razer-mouse-dock.png",
	},
	{
		__type: "device",
		group: "usb",
		id: "136",
		kind: "mouse",
		name: "Razer Basilisk Ultimate (wired)",
		visual: "assets/devices/razer-basilisk-ultimate.png",
	},

	{
		__type: "device",
		group: "usb",
		id: "136",
		kind: "mouse",
		name: "Razer Basilisk Ultimate (wireless)",
		visual: "assets/devices/razer-basilisk-ultimate.png",
	},
	{
		__type: "device",
		group: "usb",
		id: "550",
		kind: "keyboard",
		name: "Razer Huntsman Elite",
		visual: "assets/devices/razer-huntsman-elite.png",
	},
	{
		__type: "device",
		group: "usb",
		id: "3074",
		kind: "mousemat",
		name: "Razer Goliathus Extended",
		visual: "assets/devices/razer-goliathus-extended.png",
	},
	{
		__type: "device",
		group: "usb",
		id: "3587",
		kind: "streaming",
		name: "Razer Kiyo",
		visual: "assets/devices/razer-kiyo.png",
	},
];

export class LocalDeviceService implements DeviceServiceContract {
	discover = (): Observable<Device[]> =>
		of([...devices, ...connected]).pipe(delay(1000));
}
