import type { BaseMessage } from "../structures/BaseMessage";

export interface BotPermissionData {
	success: boolean;
}

export interface BotPermissionAllowedData {
	success: true;
}

export interface BotPermissionDeniedData extends BotPermissionData {
	success: false;
	reason: BotPermissionDeniedReasons;
	msg: BaseMessage;
}

export type BotPermissionDeniedReasons =
	| "discordNoData"
	| "discordMissingPermissions";
