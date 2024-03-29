import { oneLine } from "common-tags";
import { BaseMessage } from "./BaseMessage";
import Discord from "discord.js";
import { Logger } from "@framedjs/logger";

import type { DiscordInteractionData } from "../interfaces/DiscordInteractionData";
import type { DiscordInteractionSendOptions } from "../interfaces/DiscordInteractionSendOptions";
import type { DiscordMessageData } from "../interfaces/DiscordMessageData";
import type { MessageOptions } from "../interfaces/MessageOptions";
import { Place } from "../interfaces/Place";

export class DiscordInteraction extends BaseMessage {
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
		// Gets the Discord Base for elements such as author, channel, etc.
		// First check for any entries in info.discordInteraction.base
		const discordInteractionBase =
			options.discordInteraction instanceof Discord.Interaction
				? options.discordInteraction
				: options.discordInteraction?.base
				? options.discordInteraction.base
				: options.base?.discordInteraction
				? options.base.discordInteraction
				: options.discordInteraction;

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

		const channel =
			options.discordInteraction?.channel ??
			discordInteractionBase?.channel ??
			interaction?.channel;
		const client =
			options.discordInteraction?.client ??
			discordInteractionBase?.client ??
			interaction?.client;
		const guild =
			options.discordInteraction?.guild ??
			discordInteractionBase?.guild ??
			interaction?.guild ??
			null;
		const user =
			options.discordInteraction?.user ??
			discordInteractionBase?.user ??
			interaction?.user ??
			undefined;

		// Make sure it's a GuildMember object, else it's null
		// NOTE: DiscordJsApi.APIInteractionGuildMember would work, if not for discord-api-types being outdated,
		// compared to discord.js(?) - 0.22.0 vs 0.24.0
		const tempMember =
			options.discordInteraction?.member ??
			discordInteractionBase?.member ??
			interaction?.member;
		let member: Discord.GuildMember | null;
		if (!(tempMember instanceof Discord.GuildMember)) member = null;
		else member = tempMember;

		const msg =
			interaction.isMessageComponent() &&
			interaction.message instanceof Discord.Message
				? interaction.message
				: undefined;

		// Gets client or throws error
		if (!client) {
			throw new ReferenceError(
				oneLine`Parameter discordInteraction.client wasn't set when creating Message!
					This value should be set if the discord.msg parameter hasn't been set.`
			);
		}

		// Gets channel or throws error
		if (!channel) {
			throw new ReferenceError(
				oneLine`Parameter discordInteraction.channel wasn't set when creating Message!
					This value should be set if the discord.msg parameter hasn't been set.`
			);
		}

		// Gets author or throws error
		if (!user) {
			throw new ReferenceError(
				oneLine`Parameter discordInteraction.user is undefined.`
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
			msg,
			member,
			guild,
		};

		if (interaction.isApplicationCommand()) {
			this.command = this.content = interaction.commandName;
			this.args = this._getArgs();
		}
	}

	protected _getPrefix(
		place: Place,
		guild?: Discord.Guild | null | undefined
	): string | undefined {
		return;
	}

	protected _getCommand(): string | undefined {
		return this.command;
	}

	protected _getArgs(): string[] {
		if (
			// Note that context menus are considered commands, however
			// can't be interpreted as having args like normal commands.
			this.discordInteraction.interaction.isCommand() &&
			!this.discordInteraction.interaction.isContextMenu()
		) {
			return super._getArgs();
		}
		return [];
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
			| Discord.InteractionReplyOptions,
		extraOptions?: DiscordInteractionSendOptions
	): Promise<void> {
		const interaction = this.discordInteraction.interaction;
		if (
			interaction.isApplicationCommand() ||
			interaction.isContextMenu() ||
			interaction.isMessageComponent()
		) {
			const canEditReply = interaction.deferred || interaction.replied;
			const canUpdate =
				(interaction.isButton() || interaction.isSelectMenu()) &&
				!interaction.replied;
			const shouldEditReply = extraOptions?.editReply != false;

			if (shouldEditReply && (canEditReply || canUpdate)) {
				if (canUpdate) {
					await interaction.update(
						options as Discord.InteractionUpdateOptions & {
							fetchReply: true;
						}
					);
				} else {
					// Avoids empty message errors
					const forceFillInteractionContent =
						process.env.FRAMED_DEBUG_FORCE_FILL_INTERACTION_CONTENT?.toLowerCase();
					if (
						typeof options != "string" &&
						"ephemeral" in options &&
						forceFillInteractionContent == "true"
					) {
						if (!options.content) {
							Logger.error("Filled content");
							options.content = "_ _";
						}
					}
					await interaction.editReply(options);
				}
			} else {
				await interaction.reply(options);
			}
		}
	}
}
