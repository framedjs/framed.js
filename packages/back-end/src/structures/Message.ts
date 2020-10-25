import Discord from "discord.js";

export default class Message {
	public discord?: {
		readonly msg: Discord.Message;
	};

	public content?: string;

	public readonly prefix?: string;
	public readonly command?: string;
	public readonly args?: Array<string>;

	constructor(msg: Discord.Message) {
		if (msg) {
			this.discord = {
				msg: msg,
			};

			if (msg.content) {
				this.content = msg.content;
			}
		}

		this.prefix = this.getPrefix();
		this.args = this.getArgs();
		this.command = this.getCommand();
	}

	/**
	 * Gets the prefix of the message.
	 */
	getPrefix(): string | undefined {
		// Loops through potential prefixes, and gets a valid one into a variable called "prefix"
		// let prefixes = [process.env.PREFIX!, `<@!${client.user?.id}>`];
		const prefixes = ["-", ".", "!"];
		let prefix: string | undefined;
		for (let i = 0; i < prefixes.length; i++) {
			const element = prefixes[i];
			if (this.content?.indexOf(element) === 0) {
				prefix = element;
				break;
			}
		}
		return prefix;
	}

	/**
	 * Gets the arguments of the message.
	 */
	getArgs(): string[] | undefined {
		return this.prefix
			? this.content?.slice(this.prefix.length).trim().split(/ +/g)
			: undefined;
	}

	/**
	 * Gets the command of the message.
	 */
	getCommand(): string | undefined {
		return this.prefix && this.args 
			? this.args.shift()?.toLocaleLowerCase()
			: undefined
	}
}
