/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClientEvents } from "discord.js";
import { EventInfo } from "../interfaces/EventInfo";
import { BasePlugin } from "./BasePlugin";

export abstract class BaseEvent {
	public readonly name: keyof ClientEvents;
	public readonly description?: string;

	constructor(
		public readonly plugin: BasePlugin,
		info: EventInfo
	) {
		this.name = info.name;
		this.description = info.description;
	}

	abstract run(...args: any): Promise<void>;
}
