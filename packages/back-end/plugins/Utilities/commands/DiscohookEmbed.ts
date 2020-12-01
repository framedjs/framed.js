import { BasePlugin } from "../../../src/structures/BasePlugin";
import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import EscapeMarkdown from "./EscapeMarkdown";
import Discord from "discord.js";
import { logger } from "shared";
import EmbedHelper from "../../../src/utils/discord/EmbedHelper";
import * as ShortenURL from "../utils/ShortenURL";
import { stripIndent } from "common-tags";

export default class DiscohookEmbed extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "discohook",
			aliases: ["discohookembed"],
			about: "Creates JSON data usable in Discohook.",
			usage: "[id|link|content]",
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

			if (longLink) {
				let shortUrl: string | undefined;

				logger.debug(`Shortening long URL "${longLink}"`);
				await ShortenURL.shorten(longLink, (url, error) => {
					if (error) {
						logger.error(error);
					} else {
						shortUrl = url;
					}
				});

				if (shortUrl) {
					const embed = EmbedHelper.getTemplate(
						msg.discord,
						this.framedClient.helpCommands,
						this.id
					)
						.setTitle("Discohook URL")
						.setURL(shortUrl)
						.setDescription(
							stripIndent`
							I've just recreated [this message](https://discordapp.com/channels/${
								msg.discord.guild != null
									? msg.discord.guild.id
									: "@me"
							}/${msg.discord.channel.id}/${
								parse?.newMsg ? parse?.newMsg.id : msg.discord.id
							} "Discord Message") into Discohook for embed testing.
							Click the shortened link to view: ${shortUrl}
						`
						);

					await msg.discord.channel.send(embed);
					return true;
				}
			}
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
				messages: [
					{
						data: {
							content?: string | null;
							embeds?: Discord.MessageEmbed[] | null;
							username?: string | null;
							avatar_url?: string | null;
						};
					}
				];
			} = {
				messages: [
					{
						data: {},
					},
				],
			};

			const data = firstPassMessage.messages[0].data;

			if (newContent) {
				data.content = newContent;
			}

			if (newMsg) {
				if (newMsg.embeds.length > 0) {
					data.embeds = newMsg.embeds;
				}
			}

			data.username = msg.discord.client.user?.username;
			data.avatar_url = msg.discord.client.user?.avatarURL();

			// Makes TypeScript get less complaints with changing parameters
			const secondPassJson = JSON.parse(
				JSON.stringify(firstPassMessage, EscapeMarkdown.removeNulls, 0)
			);

			if (secondPassJson.messages[0].data.embeds) {
				secondPassJson.messages[0].data.embeds.forEach(
					(embed: { type: null; fields: never[] }) => {
						// Removes type: "rich"
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

			const thirdPassJson = JSON.parse(
				JSON.stringify(secondPassJson, EscapeMarkdown.removeNulls, 0)
			);

			// Make content null
			if (!thirdPassJson.messages[0].data.content) {
				thirdPassJson.messages[0].data.content = null;
			}

			const fourthPassJson = {
				messages: [
					{
						data: {
							content: thirdPassJson.messages[0].data.content,
							embeds: thirdPassJson.messages[0].data.embeds,
							username: thirdPassJson.messages[0].data.username,
							avatar_url:
								thirdPassJson.messages[0].data.avatar_url,
						},
					},
				],
			};

			const finalPassJson = JSON.stringify(fourthPassJson, undefined, 0);

			// For some reason, discohook doesn't like "+" and prefers "-".
			// This isn't considered "web safe" but it's fine here?
			const buffer = Buffer.from(finalPassJson, "utf-8");
			const base64 = buffer
				.toString("base64")
				.replace(/\+/g, "-")
				.replace(/=/g, "");
			return `https://discohook.org/?data=${base64}`;
		}

		return undefined;
	}
}
