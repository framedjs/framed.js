export interface BotPermissionData {
	success: boolean;
}

export interface BotPermissionAllowedData {
	success: true;
}

export interface BotPermissionDeniedData extends BotPermissionData {
	success: false;
	reason: BotPermissionDeniedReasons;
}

export type BotPermissionDeniedReasons =
	| "discordNoData"
	| "discordMissingPermissions";
