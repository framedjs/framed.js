/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Base } from "./Base";
import { BaseEventOptions } from "../interfaces/BaseEventOptions";
import { BasePlugin } from "./BasePlugin";
import Discord from "discord.js";
import { Logger } from "@framedjs/logger";

export abstract class BaseEvent extends Base {
	readonly plugin: BasePlugin;
	discord?: {
		client?: Discord.Client;
		name: keyof Discord.ClientEvents;
	};

	readonly fullId: string;
	readonly id: string;
	readonly description?: string;

	type: "event" = "event";

	private readonly info: BaseEventOptions;

	eventInitialized = false;

	/**
	 * Create a new BaseEvent.
	 * @param plugin Plugin that this event will be attached to
	 * @param info Event information
	 */
	constructor(plugin: BasePlugin, info: BaseEventOptions) {
		super(plugin.client);
		this.plugin = plugin;
		this.fullId = `${this.plugin.id}.${this.type}.${info.id}`;
		this.id = info.id;
		this.description = info.description;
		this.info = info;
		this.discord = info.discord;
	}

	init(): void {
		if (this.info.discord) {
			const client = this.plugin.client.discord.client;
			const name = this.info.discord?.name;

			if (!client)
				throw new ReferenceError("Discord client doesn't exist");
			if (!name)
				throw new ReferenceError(
					"Discord event name needs to be assigned"
				);

			this.discord = {
				client: client,
				name: name,
			};

			client.on(this.discord.name, this._run.bind(this));
		}
	}

	private async _run(...args: any) {
		try {
			await this.run(...args);
		} catch (error) {
			Logger.error((error as Error).stack);
		}
	}

	/**
	 * Run the event.
	 * @param args
	 */
	abstract run(...args: any): Promise<void>;
}
