import { oneLine } from "common-tags";
import { BaseMessage } from "./BaseMessage";
import Discord from "discord.js";

import type { DiscordInteractionData } from "../interfaces/DiscordInteractionData";
import type { MessageOptions } from "../interfaces/MessageOptions";

export class DiscordInteraction extends BaseMessage {
	discordInteraction!: DiscordInteractionData;

	// Forces platform to be "discord"
	platform: "discordInteraction" = "discordInteraction";

	/**
	 * Create a new Framed DiscordMessage Instance.
	 *
	 * @param options Framed Message Options
	 */
	constructor(options: MessageOptions) {
		super(options);

		this.init(options);

		// Forces this.discordInteraction to not be undefined
		if (!this.discordInteraction) {
			throw new ReferenceError(
				`this.discordInteraction is undefined, you likely only gave non-Discord data.`
			);
		}
	}

	init(options: MessageOptions): DiscordInteractionData | undefined {
		// Grabs the base of a possible message
		const base = options.base;

		// Gets the Discord Base for elements such as author, channel, etc.
		// First check for any entries in info.discordInteraction.base
		const discordInteractionBase =
			options.discordInteraction?.base ??
			base?.discordInteraction ??
			options.discordInteraction;

		if (!discordInteractionBase) return;

		this.platform = "discordInteraction";

		// Gets a Discord Interaction object
		const interaction =
			options.discordInteraction?.base instanceof Discord.Interaction
				? options.discordInteraction.base
				: base?.discordInteraction?.type == "data"
				? base.discordInteraction.interaction
				: base?.discordInteraction?.base;

		if (!interaction) return;

		const channel = discordInteractionBase?.channel ?? interaction?.channel;
		const client = discordInteractionBase?.client ?? interaction?.client;
		const guild =
			discordInteractionBase?.guild ?? interaction?.guild ?? null;
		// const member =
		// 	discordInteractionBase?.member ?? interaction?.member ?? null;
		const user =
			discordInteractionBase?.user ?? interaction?.user ?? undefined;

		// Gets client or throws error
		if (!client) {
			throw new ReferenceError(
				oneLine`Parameter discord.client wasn't set when creating Message!
					This value should be set if the discord.msg parameter hasn't been set.`
			);
		}

		// Gets channel or throws error
		if (!channel) {
			throw new ReferenceError(
				oneLine`Parameter discord.channel wasn't set when creating Message!
					This value should be set if the discord.msg parameter hasn't been set.`
			);
		}

		// Gets author or throws error
		if (!user) {
			throw new ReferenceError(
				oneLine`Parameter discord.author is undefined.`
			);
		}

		// If there's an msg object, we set all the relevant values here
		this.discordInteraction = {
			type: "data",
			interaction,
			client,
			channel,
			user,
			// member,
			guild,
		};

		return this.discordInteraction;
	}
}
