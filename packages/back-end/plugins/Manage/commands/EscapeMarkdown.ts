import { BasePlugin } from "../../../src/structures/BasePlugin";
import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { oneLine, stripIndent } from "common-tags";
import Discord from "discord.js";
import PluginManager from "packages/back-end/src/managers/PluginManager";
import { logger } from "shared";

export default class EscapeMarkdown extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "escapemd",
			aliases: ["escapemarkdown", "markdown", "md", "escmd"],
			about: "Escapes all markdown in a message.",
			description: stripIndent`
			Escapes all markdown in a message, including:
			• Code blocks and inline code
			• Bold, italics, underlines, and strikethroughs
			• Spoiler tags
			This will allow the message to be copy and pastable.`,
			usage: "<message ID | message link | message>",
			emojiIcon: "🥞",
			hideUsageInHelp: true,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord?.guild && msg.args) {
			// Grabs the argument of the thing
			let content = msg.content;

			if (msg.prefix) {
				content = content.replace(msg.prefix, "");
			}
			if (msg.command) {
				content = content.replace(msg.command, "");
			}

			content = content.trimLeft();

			// If there is no content, show the help command
			// if (content.trim().length == 0) {
			// 	await PluginManager.showHelp(msg, this.id);
			// 	return false;
			// }

			let newMsg: Discord.Message | undefined;
			let snowflake: Discord.DeconstructedSnowflake | undefined;

			// Snowflake logic
			try {
				snowflake = Discord.SnowflakeUtil.deconstruct(content.trim());

				if (snowflake) {
					newMsg = await EscapeMarkdown.getMessageFromSnowflake(
						content,
						Array.from(msg.discord.client.channels.cache.values()),
						msg.discord.channel
					);
				}
			} catch (error) {
				logger.debug("Not a snowflake, likely");
			}

			// Link logic
			if (!newMsg) {
				const newMsgOrLink = await EscapeMarkdown.getMessageFromLink(
					content,
					msg.discord.client,
					msg.discord.guild
				);
				if (newMsgOrLink instanceof Discord.Message) {
					newMsg = newMsgOrLink;
				}
			}

			// Previous message logic
			if (!newMsg && !snowflake) {
				try {
					const messages = await msg.discord.channel.messages.fetch({
						limit: 10,
					});
					messages.forEach(message => {
						if (message.content != msg.content && !newMsg) {
							newMsg = message;
						}
					});
				} catch (error) {
					logger.error(
						`Unable to fetch messages in channel\n${error.stack}`
					);
				}
			}

			// Sends the output
			if (!snowflake || newMsg) {
				// If there was a valid ID before, put the new content
				// to be the new message's contents
				if (newMsg) {
					content = newMsg.content;
				}

				const sentMessage = `${msg.discord.author}, here is your stripped markdown message:`;

				if (content.length > 0) {
					await msg.discord.channel.send(sentMessage);
					await msg.discord.channel.send(
						`${Discord.Util.escapeMarkdown(content)}`
					);
				} else if (newMsg) {
					await msg.discord.channel.send(sentMessage);
					for await (const embed of newMsg.embeds) {
						await msg.discord.channel.send(
							`\`\`\`${JSON.stringify(
								embed.toJSON(),
								EscapeMarkdown.removeNulls,
								2
							)}\`\`\``
						);
					}
				} else {
					await msg.discord.channel.send(oneLine`
					${msg.discord.author}, I'm unable to give you an escaped version of anything!`);
					return false;
				}

				return true;
			} else {
				await msg.discord.channel.send(oneLine`
				${msg.discord.author}, you inputted a message ID, but I couldn't retrieve it.
				Try running \`${msg.prefix}${msg.command}\` again in the channel the message exists in,
				or copy the message link and use that instead.`);

				return false;
			}
		}
		return false;
	}

	static removeNulls(_key: string, value: unknown): unknown {
		console.log(`${value} | ${typeof value}`);
		if (value === null) {
			return undefined;
		}
		return value;
	}

	/**
	 * Attempts to get a message from a snowflake
	 *
	 * @param snowflake Snowflake as a string
	 * @param channels List of Discord channels to scan
	 * @param commandChannel The channel that this command was ran in
	 *
	 * @returns Discord Message or undefined
	 */
	static async getMessageFromSnowflake(
		snowflake: string,
		channels: Discord.Channel[],
		commandChannel:
			| Discord.TextChannel
			| Discord.NewsChannel
			| Discord.DMChannel
	): Promise<Discord.Message | undefined> {
		let newMsg: Discord.Message | undefined;
		if (snowflake) {
			for await (const element of channels) {
				// If the message has been found, stop
				if (newMsg) continue;

				// If the channel is a DM, and the message being found
				// isn't the same place, the message shouldn't be leaked
				const channel = element as
					| Discord.TextChannel
					| Discord.NewsChannel
					| Discord.DMChannel;
				if (
					commandChannel.type == "dm" &&
					commandChannel.id != channel.id
				) {
					continue;
				}

				// Attempts to find a new message by ID
				if (!newMsg) {
					newMsg = channel.messages?.cache.get(snowflake);
				}
			}

			if (!newMsg) {
				try {
					newMsg = await commandChannel.messages.fetch(snowflake);
				} catch (error) {
					logger.warn(
						`Unable to find message with id "${snowflake}"`
					);
				}
			}
		}
		return newMsg;
	}

	/**
	 * Gets a Discord message object from a link
	 *
	 * @param link Message link
	 * @param client Discord client
	 * @param guild Discord guild
	 *
	 * @returns Discord message or an error message string
	 */
	static async getMessageFromLink(
		link: string,
		client: Discord.Client,
		guild: Discord.Guild
	): Promise<Discord.Message | string | undefined> {
		// If it's not an actual link, return undefined
		if (!link.includes(".com")) {
			return undefined;
		}

		const args = link
			.replace("https://", "")
			.replace("http://", "")
			.replace("discordapp.com/", "")
			.replace("discord.com/", "")
			.replace("channels/", "")
			.split("/");

		if (args.length != 3) {
			return "the message link isn't valid!";
		}

		if (guild.id != args[0]) {
			return "the message link cannot be from another server!";
		}

		const channel = client.channels.cache.get(args[1]) as
			| Discord.TextChannel
			| Discord.NewsChannel
			| Discord.DMChannel;
		if (!channel) {
			return `I couldn't find channel from message link!`;
		}

		let message = channel.messages.cache.get(args[2]);
		if (!message) {
			try {
				message = await channel.messages.fetch(args[2]);
			} catch (error) {
				return "I couldn't fetch the channel ID!";
			}
		}

		return message;
	}
}
