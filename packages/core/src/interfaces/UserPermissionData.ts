import type { BaseMessage } from "../structures/BaseMessage";

export interface UserPermissionData {
	success: boolean;
}

export interface UserPermissionAllowedData {
	success: true;
}

export interface UserPermissionDeniedData extends UserPermissionData {
	success: false;
	reasons: UserPermissionDeniedReason[];
	msg: BaseMessage;
}

export type UserPermissionDeniedReason =
	| "botOwnersOnly"
	| "discordMemberPermissions"
	| "discordMissingPermissions"
	| "discordMissingRole"
	| "discordNoData"
	| "discordUser"
	| "discordUserMenuFlow"
	| "unknown";
