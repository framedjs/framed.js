import { FriendlyError } from "./FriendlyError";
import Discord from "discord.js";

export class DiscordBotMissingPermissionsError extends FriendlyError {
	friendlyName = "Bot Missing Permissions";

	constructor(options: {
		/**
		 * The action that needs a specific permission. This defaults to "command",
		 * but as a guideline, use "function" for almost all other use cases.
		 */
		action?: string;

		/**
		 * The message after the main Missing Permissions message.
		 * Perferrably, a call to action for the user would be here
		 * to help them solve their problem.
		 */
		extraMessage?: string;

		/**
		 * The missing Discord permission
		 */
		permissions: Discord.PermissionResolvable;
	}) {
		super();

		if (!options.action) {
			options.action = "command";
		}
		
		this.message = `The bot is missing some permissions.`;
		if (options.extraMessage) {
			this.message += ` ${options.extraMessage}`;
		}

		this.name = DiscordBotMissingPermissionsError.name;
	}
}
