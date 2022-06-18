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
				message = await DiscordUtils.getMessageWithRenderOptions(
					msg.discord.client,
					{
						...options,
						channelId: options?.channelId ?? msg.discord.channel.id,
					}
				);
			} else if (interaction.isCommand()) {
				const messageLinkOrId = interaction.options.getString(
					"message",
					true
				);
				message = (
					await DiscordUtils.getMessageFromBaseMessage(msg, {
						messageId: messageLinkOrId,
					})
				).message;
			}
		} else {
			try {
				message = (
					await DiscordUtils.getMessageFromBaseMessage(msg, {
						messageId: msg.args ? msg.args[0] : undefined,
					})
				).message;
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

		return {
			...options,
			message: message,
			usedMessageHistory: usedMessageHistory,
		};
	}

	abstract render(
		msg: DiscordMessage | DiscordInteraction,
		options: BaseDiscordMenuFlowMsgPageOptions
	): Promise<boolean>;
}
