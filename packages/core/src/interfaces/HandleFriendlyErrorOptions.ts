export interface HandleFriendlyErrorOptions {
	/**
	 * Should this function catch all errors by default?
	 * @default true
	 */
	catchSendMessage?: boolean;

	/**
	 * If true, the function will try to send an ephemeral reply,
	 * and not edit the original message.
	 */
	sendSeparateReply?: boolean;
}
