/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseEventOptions } from "../interfaces/BaseEventOptions";
import { BasePlugin } from "./BasePlugin";
import FramedClient from "./FramedClient";
import { BaseEventDiscordOptions } from "../interfaces/BaseEventDiscordOptions";

export abstract class BaseEvent {
	public readonly framedClient: FramedClient;
	public readonly plugin: BasePlugin;
	public readonly discord: BaseEventDiscordOptions | undefined;

	public readonly id: string;
	public readonly description?: string;

	/**
	 * Create a new BaseEvent.
	 * @param plugin Plugin that this event will be attached to
	 * @param info Event information
	 */
	constructor(plugin: BasePlugin, info: BaseEventOptions) {
		this.framedClient = plugin.framedClient;
		this.plugin = plugin;
		this.discord = info.discord;		

		this.id = `${this.plugin.id}.event.${info.id}`;
		this.description = info.description;
	}

	/**
	 * Run the event.
	 * @param args 
	 */
	abstract run(...args: any): Promise<void>;
}
