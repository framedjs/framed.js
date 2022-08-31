export interface BaseDiscordMenuFlowSelectMenuHandleOptions {
	/**
	 * Should this function throw a PageNotFoundError,
	 * if a page wasn't found? If true, the default
	 * error message will not send, and should be handled
	 * by the bot developer.
	 * @default false
	 */
	returnPageNotFoundError?: boolean;
}
