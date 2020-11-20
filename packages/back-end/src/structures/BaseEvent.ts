/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ClientEvents } from "discord.js";
import { EventInfo } from "../interfaces/EventInfo";
import { BasePlugin } from "./BasePlugin";
import FramedClient from "./FramedClient";

export abstract class BaseEvent {
	public readonly framedClient: FramedClient;
	public readonly plugin: BasePlugin
	public readonly name: keyof ClientEvents;
	public readonly description?: string;

	/**
	 * Create a new BaseEvent.
	 * @param plugin Plugin that this event will be attached to
	 * @param info Event information
	 */
	constructor(plugin: BasePlugin, info: EventInfo) {
		this.framedClient = plugin.framedClient;
		this.plugin = plugin;
		this.name = info.name;
		this.description = info.description;

		// console.log("BaseEvent.ts: ");
		// console.log(this.framedClient != undefined);
		// console.log(plugin != undefined);
		// console.log(plugin.framedClient != undefined);
	}

	/**
	 * Run the event.
	 * @param args 
	 */
	abstract async run(...args: any): Promise<void>;
}
