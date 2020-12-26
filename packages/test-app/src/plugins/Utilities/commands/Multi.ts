import { FramedMessage, BasePlugin, BaseCommand } from "back-end";
import { oneLine, stripIndents } from "common-tags";
import { logger } from "shared";

export default class Multi extends BaseCommand {
	constructor(plugin: BasePlugin) {
		const section1 = stripIndents`\`\`\`
		{{prefix}}{{id}} command add test "This is a test";
		${plugin.framedClient.defaultPrefix}test\`\`\``;

		const section2 = stripIndents`\`\`\`
		{{prefix}}{{id}} command add test "This is a test";
		$(command default.bot.manage.command.group) set owo "Dailies";
		$(command default.bot.info.command.help)\`\`\``;

		super(plugin, {
			id: "multi",
			about: "Run multiple commands with one message.",
			description: oneLine`
			Run multiple commands with one message. Separate each command with a semicolon (;)
			and a new line.`,
			examples: stripIndents`
			${section1}${section2}
			`,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg, this.permissions)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args) {
			const content = msg.getArgsContent();
			const parsed = Multi.parse(content);

			for await (const parse of parsed) {
				const newMsg = new FramedMessage({
					framedClient: this.framedClient,
					content: parse,
					discord: {
						base: msg,
					},
				});
				const results = await this.framedClient.pluginManager.runCommand(
					newMsg
				);
				let somethingWentWrong = false;

				if (results.size == 0) {
					somethingWentWrong = true;
				}

				for (const [key, value] of results) {
					logger.debug(`Multi.ts results - "${key}" : ${value}`);
					if (value == false) {
						somethingWentWrong = true;
					}
				}

				if (somethingWentWrong) {
					await msg.discord?.channel.send(
						stripIndents`${msg.discord.author}, something went wrong when running the commands!
						
						Reasons why this can happen include:
						- If a command wasn't typed correctly
						- If you forgot a prefix (it needs it, or it'll pretend you sent a message without a prefix!)
						- There is a missing semicolon

						Double-check your commands, and try again.
						`
					);
					return false;
				}
			}

			return true;
		}

		return false;
	}

	static parse(content: string): string[] {
		const parsed: string[] = [];
		let arg = "";

		for (let i = 0; i < content.length; i++) {
			// Sets the character and adds it to the arg variable
			const char = content[i];
			arg += char;

			// Checks to see if we should parse it
			const isNewLine = char == "\n";
			const lastChar = i == content.length - 1;

			// New line, or last character in the string, will trigger the checks needed to parse
			if (isNewLine || lastChar) {
				const secondLastCharSemicolon = content[i - 1] == ";";
				const lastCharIsEscaped = content[i - 2] == "\\";

				// Check for the ;\n, or see it's the last character in the string
				if (
					(secondLastCharSemicolon && !lastCharIsEscaped) ||
					lastChar
				) {
					// Parses out the ;\n if it's there
					if (secondLastCharSemicolon && !lastCharIsEscaped) {
						arg = arg.slice(0, arg.length - 2);
					}

					// Handles edge case in where there is no \n, but there is a semicolon
					if (char == ";" && content[i - 1] != "\\") {
						arg = arg.slice(0, arg.length - 1);
					}

					// Pushes the results and clears the arg variable
					parsed.push(arg);
					arg = "";
				}
			}
		}

		return parsed;
	}
}
