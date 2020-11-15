/**
 * Used with initializing Framed client.
 */
export interface FramedClientInfo {
	/**
	 * The prefix used for all commands, except when a plugin or commands explicitly uses something else
	 */
	defaultPrefix?: string;

	/**
	 * A version number, separate from the Framed framework itself.
	 */
	backEndVersion?: string;
}
