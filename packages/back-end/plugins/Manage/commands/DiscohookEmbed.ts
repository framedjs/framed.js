import { BasePlugin } from "../../../src/structures/BasePlugin";
import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import EscapeMarkdown from "./EscapeMarkdown";
import Discord from "discord.js";
import { logger } from "shared";
import EmbedHelper from "packages/back-end/src/utils/discord/EmbedHelper";
// import UrlShortener from "node-url-shortener";

export default class DiscohookEmbed extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "discohook",
			aliases: ["discohookembed"],
			about: "Creates JSON data usable in Discohook.",
			usage: "<message ID | message link | message>",
			emojiIcon: "⚓",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			const parse = await EscapeMarkdown.getNewMessage(msg);
			const longLink = await DiscohookEmbed.getLink(
				msg,
				parse?.newContent,
				parse?.newMsg
			);

			const embed = EmbedHelper.getEmbedTemplate(msg.discord, this.framedClient, this.id)

			// if (longLink.length > 2048) {

			// }

			await msg.discord.channel.send(embed);

			return true;
		}
		return false;
	}

	static async getLink(
		msg: FramedMessage,
		newContent?: string,
		newMsg?: Discord.Message
	): Promise<string | undefined> {
		if (msg.discord && msg.discord.msg) {
			const firstPassMessage: {
				content?: string | null;
				embeds?: Discord.MessageEmbed[] | null;
				username?: string | null;
				avatar_url?: string | null;
			} = {};

			if (newContent) {
				firstPassMessage.content = newContent;
			}

			if (newMsg) {
				if (newMsg.embeds.length > 0) {
					firstPassMessage.embeds = newMsg.embeds;
				}
			}

			firstPassMessage.username = msg.discord.client.user?.username;
			firstPassMessage.avatar_url = msg.discord.client.user?.avatarURL();

			const newObject = {
				message: firstPassMessage,
			};

			// Makes TypeScript get less complaints with changing parameters
			const secondPassJson = JSON.parse(
				JSON.stringify(newObject, EscapeMarkdown.removeNulls, 0)
			);

			if (secondPassJson.message.embeds) {
				secondPassJson.message.embeds.forEach(
					(embed: { type: null; fields: never[] }) => {
						// Removes type
						embed.type = null;
						if (embed.fields) {
							// Removes inline variables, through removeNulls
							embed.fields.forEach(
								(field: { inline: boolean | null }) => {
									if (field.inline == false) {
										field.inline = null;
									}
								}
							);
						}
					}
				);
			}

			const thirdPassJson = JSON.stringify(
				secondPassJson,
				EscapeMarkdown.removeNulls,
				0
			);

			// For some reason, discohook doesn't like "+" and prefers "-".
			// This isn't considered "web safe" but it's fine here?
			const buffer = Buffer.from(thirdPassJson, "utf-8");
			const base64 = buffer
				.toString("base64")
				.replace(/\+/, "-")
				.replace(/=/g, "");
			return `https://discohook.org/?message=${base64}`;
		}

		return undefined;
	}
}
