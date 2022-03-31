import { BaseDiscordMenuFlowStartPage } from "./BaseDiscordMenuFlowStartPage";
import { DiscordInteraction } from "./DiscordInteraction";
import { DiscordMessage } from "./DiscordMessage";
import { DiscordUtils } from "../utils/discord/DiscordUtils";
import Discord from "discord.js";
import { FriendlyError } from "./errors/FriendlyError";
import { InternalError } from "./errors/InternalError";
import { Logger } from "@framedjs/logger";

import type { DiscordMenuFlowIdData } from "../interfaces/DiscordMenuFlowIdData";
import type { BaseDiscordMenuFlowMsgPageOptions } from "../interfaces/BaseDiscordMenuFlowMsgPageOptions";

export abstract class BaseDiscordMenuFlowMsgPage extends BaseDiscordMenuFlowStartPage {
	private static async _getMessage(
		channel: Discord.TextBasedChannel,
		options?: string | DiscordMenuFlowIdData
	) {
		let messageId: string | undefined;
		if (typeof options == "string") {
			messageId = options;
		} else {
			messageId = options?.messageId;
		}

		if (!messageId) {
			throw new InternalError(
				"The message wasn't found within interaction data!"
			);
		}

		const pollMessage = await DiscordUtils.getMessageFromId(
			messageId,
			channel
		);

		if (!pollMessage) {
			throw new FriendlyError(`The message wasn't able to be found!`);
		}

		return pollMessage;
	}

	async parse(
		msg: DiscordMessage | DiscordInteraction,
		options?: DiscordMenuFlowIdData
	): Promise<BaseDiscordMenuFlowMsgPageOptions> {
		options = await super.parse(msg, options);

		let message: Discord.Message | undefined;
		let usedMessageHistory = false;
		if (msg instanceof DiscordInteraction) {
			const interaction = msg.discordInteraction.interaction;
			if (interaction.isContextMenu()) {
				const newMessage = interaction.options.getMessage(
					"message",
					true
				);
				if (!(newMessage instanceof Discord.Message)) {
					throw new InternalError(
						`newMessage was not of type Discord.Message`
					);
				}
				message = newMessage;
			} else if (interaction.isSelectMenu() || interaction.isButton()) {
				message = await BaseDiscordMenuFlowMsgPage._getMessage(
					msg.discord.channel,
					options
				);
			} else if (interaction.isCommand()) {
				const messageLinkOrId = interaction.options.getString(
					"message",
					true
				);
				message = await BaseDiscordMenuFlowMsgPage._getMessage(
					msg.discord.channel,
					{ messageId: messageLinkOrId }
				);
			}
		} else {
			try {
				message = await BaseDiscordMenuFlowMsgPage._getMessage(
					msg.discord.channel,
					{
						messageId: msg.args ? msg.args[0] : undefined,
					}
				);
			} catch (error) {
				if (error instanceof FriendlyError) {
					// Previous message logic
					if (!message) {
						usedMessageHistory = true;
						try {
							const messages =
								await msg.discord.channel.messages.fetch({
									limit: 10,
								});
							messages.forEach(msg => {
								if (msg.content != msg.content && !msg) {
									message = msg;
								}
							});
						} catch (error) {
							Logger.error(
								`Unable to fetch messages in channel\n${
									(error as Error).stack
								}`
							);
						}
					}

					if (!message) {
						throw new FriendlyError(`No valid message was found!`);
					}
				}

				// If still no poll message, throw an error
				if (!message) {
					throw error;
				}
			}
		}
		if (!message) {
			throw new InternalError(`Message wasn't able to be found!`);
		}

		const newOptions: BaseDiscordMenuFlowMsgPageOptions = Object.assign(
			options,
			{
				message: message,
				usedMessageHistory: usedMessageHistory,
			} as BaseDiscordMenuFlowMsgPageOptions
		);
		return newOptions;
	}

	abstract render(
		msg: DiscordMessage | DiscordInteraction,
		options: BaseDiscordMenuFlowMsgPageOptions
	): Promise<boolean>;
}