import type Discord from "discord.js";

export interface HandleFriendlyErrorOptions {
	/**
	 * Should this function catch all errors by default?
	 * @default true
	 */
	catchSendMessage?: boolean;

	/**
	 * If false, the function won't try to send an ephemeral reply,
	 * and not edit the original message.
	 * @default true
	 */
	sendSeparateReply?: boolean;

	/**
	 * Is the error message ephemeral?
	 * @default false
	 */
	ephemeral?: boolean;

	/**
	 * Optional message options override
	 */
	messageOptions?:
		| Discord.BaseMessageOptions
		| Discord.InteractionReplyOptions
		| undefined;

	/**
	 * Manual override for how newlines work for message content.
	 * Useful for custom command managers * which adds fields
	 * to embeds, then gets converted to text, but then looks misaligned
	 * once message components gets introduced.
	 */
	newLineOverride?: string;
}
