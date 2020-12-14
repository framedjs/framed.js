/* eslint-disable no-mixed-spaces-and-tabs */
import { BasePlugin } from "back-end/src/structures/BasePlugin";
import FramedMessage from "back-end/src/structures/FramedMessage";
import { BaseCommand } from "back-end/src/structures/BaseCommand";
import { oneLine, stripIndent } from "common-tags";
import Discord from "discord.js";
import { logger } from "shared";

export default class EscapeMarkdown extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "escapemd",
			aliases: ["escapemarkdown", "markdown", "md"],
			about: "Escapes all markdown in a message.",
			description: oneLine`
			Escapes all markdown in a message, including code blocks,
			bold, italics, underlines, and strikethroughs.
			This allows the message to be copy and pastable.`,
			usage: "[id|link|content]",
			examples: stripIndent`
			\`{{prefix}}escapemd\`
			\`{{prefix}}escapemd This ~~is~~ a **test**!\``,
			permissions: {
				discord: {
					roles: ["462342299171684364", "758771336289583125"],
				},
			},
			inline: true,
			// hideUsageInHelp: true,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (!this.hasPermission(msg)) {
			await this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.discord?.guild && msg.args) {
			const parse = await EscapeMarkdown.getNewMessage(msg, true);
			return await EscapeMarkdown.showStrippedMessage(
				msg,
				parse?.newContent,
				parse?.newMsg
			);
		}

		return false;
	}

	/**
	 *
	 * @param msg
	 * @param silent
	 */
	static async getNewMessage(
		msg: FramedMessage,
		cleanUp?: boolean,
		silent?: boolean
	): Promise<{ newMsg?: Discord.Message; newContent?: string } | undefined> {
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

			// Snowflake logic
			let snowflakeMsg: Discord.Message | undefined;
			const snowflake = Discord.SnowflakeUtil.deconstruct(content.trim());
			const validSnowflake =
				snowflake.binary !=
					"0000000000000000000000000000000000000000000000000000000000000000" &&
				/^\d+$/.test(content);
			if (validSnowflake) {
				snowflakeMsg = await EscapeMarkdown.getMessageFromSnowflake(
					content,
					Array.from(msg.discord.client.channels.cache.values()),
					msg.discord.channel
				);
			}

			// Link logic
			let linkMsg: Discord.Message | string | undefined;
			if (!snowflakeMsg) {
				linkMsg = await EscapeMarkdown.getMessageFromLink(
					content,
					msg.discord.client,
					msg.discord.author,
					msg.discord.guild
				);
			}

			// Previous message logic
			let previousMsg: Discord.Message | undefined;
			if (!linkMsg && !snowflakeMsg) {
				try {
					const messages = await msg.discord.channel.messages.fetch({
						limit: 10,
					});
					messages.forEach(message => {
						if (message.content != msg.content && !previousMsg) {
							previousMsg = message;
						}
					});
				} catch (error) {
					logger.error(
						`Unable to fetch messages in channel\n${error.stack}`
					);
				}
			}

			// Sends the output
			let newMsg: Discord.Message | undefined;
			let newContent: string | undefined;

			if (validSnowflake) {
				if (snowflakeMsg) {
					if (cleanUp) {
						newContent = `${Discord.Util.escapeMarkdown(
							snowflakeMsg.content
						)}`;
					} else {
						newContent = snowflakeMsg.content;
					}
					newMsg = snowflakeMsg;
				} else {
					if (!silent)
						await msg.discord.channel.send(oneLine`
					${msg.discord.author}, I think you inputted a message ID, but I couldn't retrieve it.
					Try running \`${msg.prefix}${msg.command}\` again in the channel the message exists in,
					or copy the message link and use that instead.`);
					return undefined;
				}
			} else if (linkMsg) {
				if (linkMsg instanceof Discord.Message) {
					if (cleanUp) {
						newContent = `${Discord.Util.escapeMarkdown(
							linkMsg.content
						)}`;
					} else {
						newContent = linkMsg.content;
					}
					newMsg = linkMsg;
				} else {
					if (!silent)
						await msg.discord.channel.send(
							`${msg.discord.author}, ${linkMsg}`
						);
				}
			} else if (content.length > 0) {
				if (cleanUp)
					newContent = `${Discord.Util.escapeMarkdown(content)}`;
				else newContent = content;
			} else if (previousMsg) {
				if (cleanUp) {
					newContent = `${Discord.Util.escapeMarkdown(
						previousMsg.content
					)}`;
				} else {
					newContent = previousMsg.content;
				}
				newMsg = previousMsg;
			} else {
				if (!silent)
					await msg.discord.channel.send(oneLine`
					${msg.discord.author}, I'm unable to give you an escaped version of anything!`);
				return undefined;
			}

			// Returns the output
			if ((newContent && newContent.length > 0) || newMsg) {
				return {
					newMsg,
					newContent,
				};
			}
		}

		return undefined;
	}

	/**
	 * Shows the message that has markdown stripped.
	 *
	 * @param msg
	 * @param newContent
	 * @param newMsg
	 * @param silent
	 */
	static async showStrippedMessage(
		msg: FramedMessage,
		newContent?: string,
		newMsg?: Discord.Message,
		silent?: boolean
	): Promise<boolean> {
		if (msg.discord) {
			const successMessage = `${msg.discord.author}, here is your stripped markdown message:`;

			let sentAnything = false;

			// Handles contents
			if (newContent && newContent?.length > 0) {
				sentAnything = true;
				await msg.discord.channel.send(successMessage);
				await msg.discord.channel.send(newContent);
			}

			// Handles messages that might have embeds
			if (newMsg && newMsg.embeds.length > 0) {
				if (!sentAnything) {
					await msg.discord.channel.send(successMessage);
					sentAnything = true;
				}

				for await (const embed of newMsg.embeds) {
					await msg.discord.channel.send(
						`\`\`\`${JSON.stringify(
							embed.toJSON(),
							EscapeMarkdown.removeNulls,
							2
						)}\`\`\``
					);
				}
			}

			if (!sentAnything) {
				if (!silent)
					await msg.discord.channel.send(oneLine`
					${msg.discord.author}, I'm unable to give you an escaped version of anything!`);
				return false;
			}

			return true;
		}

		return false;
	}

	/**
	 * JSON.stringify replacer that removes things that are null
	 *
	 * @param key
	 * @param value
	 *
	 * @returns value, if not null
	 */
	static removeNulls(_key: string, value: unknown): unknown {
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
		author: Discord.User,
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
			return `I couldn't find the channel from the message link!`;
		} else if (channel.type == "dm" && author.id != channel.id) {
			return `I won't retrieve private DMs into a public server.`;
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
