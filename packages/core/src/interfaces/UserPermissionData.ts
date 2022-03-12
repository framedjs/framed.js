export interface UserPermissionData {
	success: boolean;
}

export interface UserPermissionAllowedData {
	success: true;
}

export interface UserPermissionDeniedData extends UserPermissionData {
	success: false;
	reasons: UserPermissionDeniedReasons[];
}

export type UserPermissionDeniedReasons =
	| "botOwnersOnly"
	| "discordMemberPermissions"
	| "discordMissingPermissions"
	| "discordMissingRole"
	| "discordNoData"
	| "discordUser"
	| "discordUserMenuFlow"
	| "unknown";
