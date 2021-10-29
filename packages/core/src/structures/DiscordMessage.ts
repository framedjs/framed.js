import { oneLine } from "common-tags";
import { BaseMessage } from "./BaseMessage";
import { Utils } from "@framedjs/shared";
import Discord from "discord.js";
import type { DiscordMessageData } from "../interfaces/DiscordMessageData";
import type { MessageOptions } from "../interfaces/MessageOptions";

export class DiscordMessage extends BaseMessage {
	discord!: DiscordMessageData;

	// Forces platform to be "discord"
	platform: "discord" = "discord";

	/**
	 * Create a new Framed DiscordMessage Instance.
	 *
	 * @param options Framed Message Options
	 */
	constructor(options: MessageOptions) {
		super(options);

		this.init(options);

		// Forces this.discord to not be undefined
		if (!this.discord) {
			throw new ReferenceError(
				`this.discord is undefined, you likely only gave non-Discord data.`
			);
		}
	}

	init(options: MessageOptions): DiscordMessageData | undefined {
		// Gets the Discord Base for elements such as author, channel, etc.
		// First check for any entries in info.discord.base
		const discordBase =
			options.discord instanceof Discord.Message
				? options.discord
				: options.discord?.base
				? options.discord.base
				: options.base?.discord
				? options.base.discord
				: options.discord;

		if (!discordBase) return;

		this.platform = "discord";
		let channel = discordBase?.channel;
		let id = discordBase?.id;

		const msg =
			discordBase instanceof Discord.Message
				? discordBase
				: id && channel
				? channel.messages.cache.get(id)
				: undefined;
		channel = channel ?? msg?.channel;
		id = id ?? msg?.id;

		const client = discordBase?.client ?? msg?.client;
		const guild = discordBase?.guild ?? msg?.guild ?? null;
		const member = discordBase.member ?? msg?.member ?? null;
		const author = discordBase?.author ?? msg?.author ?? member?.user;

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
		if (!author) {
			throw new ReferenceError(
				oneLine`Parameter discord.author is undefined.`
			);
		}

		// If there's an msg object, we set all the relevant values here
		this.discord = {
			msg: msg,
			client: client,
			id: id,
			channel: channel,
			author: author,
			member: member,
			guild: guild,
		};

		// If the content string is empty, try and fill it
		if (!this.content && id) {
			const tempContent =
				msg?.channel.messages.cache.get(id)?.content ?? msg?.content;
			if (tempContent) {
				this.content = tempContent;
			}
		}

		return this.discord;
	}

	/**
	 * Sends a message on Discord.
	 *
	 * @param options
	 */
	async send(
		options: string | Discord.MessagePayload | Discord.MessageOptions
	): Promise<Discord.Message> {
		return this.discord.channel.send(options);
	}

	static async startCountdownBeforeDeletion(
		msg: Discord.Message,
		options: {
			seconds: number;
			showTimer: boolean;
		} = {
			seconds: 3,
			showTimer: true,
		}
	): Promise<void> {
		let startTime: [number, number];
		let content = "";
		for (let i = options.seconds; i > 0; i--) {
			startTime = process.hrtime();

			if (!content) {
				content = msg.content;
			}

			if (options.showTimer && msg && !msg.deleted) {
				await msg.edit(`${content} (Hiding message in ${i}...)`);
			}

			const stopTime = Math.round(process.hrtime(startTime)[1] / 1e6);
			await Utils.sleep(1000 - stopTime);
		}
		if (msg && !msg.deleted) await msg.delete();
	}
}
