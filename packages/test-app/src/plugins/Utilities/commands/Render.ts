/* eslint-disable no-mixed-spaces-and-tabs */
import {
	FramedMessage,
	BasePlugin,
	BaseCommand,
	PluginManager,
} from "back-end";
import { logger, Utils } from "shared";
import Discord from "discord.js";
import { oneLine, stripIndent, stripIndents } from "common-tags";
import Axios from "axios";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "render",
			aliases: ["renderembed"],
			about: "Creates an embed from a Discohook URL or JSON.",
			description: stripIndent`
			Creates an embed from Discohook JSON or URL. 
			${oneLine`To get JSON from Discohook, click JSON Editor > Copy to Clipboard.
			For a URL you can use the built-in Discohook "Share Message" URL, or any other shortened URL.`}
			`,
			usage: "<json|link>",
			examples: stripIndent`
			\`{{prefix}}{{id}} { "content": "Hello!" }\`
			\`{{prefix}}{{id}} https://is.gd/ZJGQnw\`
			\`{{prefix}}{{id}} https://share.discohook.app/go/xxxxxxxx\`			
			`,
			permissions: {
				discord: {
					roles: ["758771336289583125", "462342299171684364"],
				},
			},
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (!this.hasPermission(msg)) {
			this.sendPermissionErrorMessage(msg);
		}

		if (msg.discord && msg.args && msg.prefix && msg.command) {
			let newContents = msg.getArgsContent();

			if (newContents.trim().length == 0) {
				await PluginManager.sendHelpForCommand(msg);
				return false;
			}

			// Parses the codeblock characters out if they exist
			const firstThreeCharacters = newContents.substring(0, 3);
			const lastThreeCharacters = newContents.substring(
				newContents.length - 3,
				newContents.length
			);
			if (firstThreeCharacters == "```json") {
				newContents = newContents.substring(7, newContents.length);
			} else if (firstThreeCharacters == "```") {
				newContents = newContents.substring(3, newContents.length);
			}
			if (lastThreeCharacters == "```") {
				newContents = newContents.substring(0, newContents.length - 3);
			}

			// http://urlregex.com/
			// eslint-disable-next-line no-useless-escape
			const regex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/g;
			const matches = msg.args[0]?.matchAll(regex);

			// Embed data
			let newEmbedData;

			// Link and domain found
			let link = "";
			let domain = "";

			if (matches) {
				for (const match of matches) {
					link = match[0];
					domain = match[2];
					break;
				}
			}

			// Attempts to parse out the URL, and get base64 data from it
			// if a link that has the data needed is used
			if (
				link.length > 0 &&
				domain.length > 0 &&
				msg.args[0]?.trim() == link
			) {
				try {
					const response = await Axios.get(link);
					if (response.request.path) {
						const path = response.request.path as string;
						const base64 = Buffer.from(
							path.replace("/?data=", ""),
							"base64"
						);
						const newString = base64.toString("utf-8");
						newEmbedData = JSON.parse(newString).messages[0]?.data;
					} else {
						throw new Error("No request path");
					}
				} catch (error) {
					logger.warn(error.stack);
					await msg.discord.channel
						.send(oneLine`${msg.discord.author}, I couldn't read the link!
						Make sure your link leads to https://discohook.org, and try again.`);
					return false;
				}
			} else if (newContents) {
				// The contents are JSON, and should attempt to be parsed
				try {
					newEmbedData = JSON.parse(newContents);
				} catch (error) {
					logger.warn(error.stack);
					await msg.discord.channel.send(
						stripIndents`${msg.discord.author}, I couldn't parse that into an embed!
						\`${error}\`
						See console logs for more details.
						`
					);
					return false;
				}
			}

			logger.warn(`newEmbedData: ${Utils.util.inspect(newEmbedData)}`);

			// Renders the Discohook message
			let renderedOnce = false;
			for (
				let i = 0;
				i < (newEmbedData.embeds ? newEmbedData.embeds.length : 1);
				i++
			) {
				logger.warn(oneLine`i: ${i} |
				(newEmbedData.embeds ? newEmbedData.embeds.length : 1): ${
					newEmbedData.embeds ? newEmbedData.embeds.length : 1
				} |
				renderedOnce: ${renderedOnce}`);

				// Embed data is generated if it exists
				const embedData = newEmbedData.embeds
					? newEmbedData.embeds[i]
					: undefined;
				const embed = embedData
					? new Discord.MessageEmbed(
							Utils.turnUndefinedIfNull(
								embedData
							) as Discord.MessageEmbedOptions
					  )
					: undefined;

				// Content will only be used for the first embed
				const content =
					i == 0
						? (Utils.turnUndefinedIfNull(
								newEmbedData.content
						  ) as string)
						: undefined;

				if (content) {
					if (embed) {
						await msg.discord.channel.send(content, embed);
						renderedOnce = true;
					} else {
						await msg.discord.channel.send(content);
						renderedOnce = true;
					}
				} else if (embed) {
					await msg.discord.channel.send(embed);
					renderedOnce = true;
				}
			}

			if (!renderedOnce) {
				await msg.discord.channel.send(
					`${msg.discord.author}, there was nothing to render.`
				);
				return false;
			}

			return true;
		}
		return false;
	}
}
