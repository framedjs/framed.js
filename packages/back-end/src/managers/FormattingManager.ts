import { logger } from "shared";
import { BaseSubcommand } from "../structures/BaseSubcommand";
import FramedClient from "../structures/FramedClient";

export default class FormattingManager {
	/**
	 * Parses custom $() formatting
	 */
	static async parseCustomFormatting(
		arg: string,
		framedClient: FramedClient
	): Promise<string> {
		// Matches $(test) pattern
		const regex = /(\$\(.*?\))/g;
		const array = [...arg.matchAll(regex)];

		for await (const element of array) {
			// Removes the $()
			const formatArgs = element[0]
				.slice(2, element[0].length - 1)
				.split(" ");
			const formatCommand = formatArgs.shift();

			switch (formatCommand) {
				case "command":
				case "commandnoprefix":
				case "subcommand":
					try {
						const command = formatArgs[0];
						if (command) {
							const baseCommand = framedClient.plugins.getCommand(
								command
							);

							if (!baseCommand) {
								throw new ReferenceError();
							}

							let toReplace = `${baseCommand.defaultPrefix}${baseCommand.id}`;
							if (formatCommand == "commandnoprefix") {
								toReplace = baseCommand.id;
							}

							if (formatCommand != "subcommand") {
								arg = arg.replace(element[0], toReplace);
							} else {
								const clone = [...formatArgs];
								clone.shift();

								let baseSubcommands:
									| BaseSubcommand[]
									| undefined;

								if (clone.length > 0) {
									baseSubcommands = baseCommand.getSubcommandChain(
										clone
									);
								} else {
									// TODO
									// baseSubcommand = framedClient.pluginManager.getSubcommand(command);
								}

								if (!baseSubcommands) {
									throw new ReferenceError();
								}

								let list = "";
								baseSubcommands.forEach(baseSubcommand => {
									list += `${baseSubcommand.id} `;
								});
								list = list.trim();

								toReplace = `${toReplace}${list}`;
								arg = arg.replace(element[0], toReplace);
							}
						} else {
							throw new ReferenceError();
						}
					} catch (error) {
						logger.error(error.stack);
					}

					break;

				default:
					break;
			}
		}

		return arg;
	}

	
}
