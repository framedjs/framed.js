import { oneLine } from "common-tags";
import { BaseMessage } from "./BaseMessage";
import Discord from "discord.js";

import type { DiscordInteractionData } from "../interfaces/DiscordInteractionData";
import type { DiscordMessageData } from "../interfaces/DiscordMessageData";
import type { MessageOptions } from "../interfaces/MessageOptions";
import { DiscordJsApi } from "..";

export class DiscordInteraction extends BaseMessage {
	args: undefined;
	discord!: DiscordMessageData;
	discordInteraction!: DiscordInteractionData;

	// Forces platform to be "discordInteraction"
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
		// Forces this.discord to not be undefined
		if (!this.discord) {
			throw new ReferenceError(
				`this.discord is undefined, you likely only gave non-Discord data.`
			);
		}
	}

	init(options: MessageOptions): void {
		// Grabs the base of a possible message
		const base = options.base;

		// Gets the Discord Base for elements such as author, channel, etc.
		// First check for any entries in info.discordInteraction.base
		const discordInteractionBase =
			options.discordInteraction instanceof Discord.Interaction
				? options.discordInteraction
				: options.discordInteraction?.base
				? base?.discordInteraction
				: undefined;

		if (!discordInteractionBase) return;

		this.platform = "discordInteraction";

		// Gets a Discord Interaction object
		const interaction =
			discordInteractionBase instanceof Discord.Interaction
				? discordInteractionBase
				: discordInteractionBase.type == "data"
				? discordInteractionBase.interaction
				: discordInteractionBase.base;

		if (!interaction) return;

		const channel = discordInteractionBase?.channel ?? interaction?.channel;
		const client = discordInteractionBase?.client ?? interaction?.client;
		const guild =
			discordInteractionBase?.guild ?? interaction?.guild ?? null;
		const user =
			discordInteractionBase?.user ?? interaction?.user ?? undefined;

		// Make sure it's a GuildMember object, else it's null
		// NOTE: DiscordJsApi.APIInteractionGuildMember would work, if not for discord-api-types being outdated,
		// compared to discord.js(?) - 0.22.0 vs 0.24.0
		const tempMember =
			discordInteractionBase?.member ?? interaction?.member;
		let member: Discord.GuildMember | null;
		if (!(tempMember instanceof Discord.GuildMember)) member = null;
		else member = tempMember;

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
			member,
			guild,
		};

		this.discord = {
			author: user,
			client,
			channel,
			member,
			guild,
		};
	}

	/**
	 * Sends a message on Discord, through interactions.
	 *
	 * @param options
	 */
	async send(
		options:
			| string
			| Discord.MessagePayload
			| Discord.InteractionReplyOptions
	): Promise<void> {
		const interaction = this.discordInteraction.interaction;
		if (
			interaction.isButton() ||
			interaction.isCommand() ||
			interaction.isContextMenu() ||
			interaction.isMessageComponent() ||
			interaction.isSelectMenu()
		) {
			if (!interaction.deferred) {
				await interaction.reply(options);
			} else {
				await interaction.editReply(options);
			}
		}
	}
}
