import Discord from "discord.js";

export interface BotPermissions {
	/**
	 * Should the user's permissions be handled by the framework automatically?
	 * If you'd like handle this yourself, set this variable to false.
	 *
	 * @default true
	 *
	 * @example
	 * ```ts
	 * // Put this inside your run() function in the command:
	 * const permsResult = this.checkBotPermission(msg, this.botPermissions);
	 * if (!permsResult.success) {
	 * 	await this.sendBotPermissionErrorMessage(
	 * 		msg,
	 * 		this.botPermissions,
	 * 		permsResult
	 * 	);
	 * 	return false;
	 * }
	 * ```
	 */
	checkAutomatically?: boolean;

	/**
	 * Discord permission options
	 */
	discord?: {
		/**
		 * Checks if the bot can match these permissions.
		 */
		permissions?: Discord.PermissionResolvable[];
	};
}
