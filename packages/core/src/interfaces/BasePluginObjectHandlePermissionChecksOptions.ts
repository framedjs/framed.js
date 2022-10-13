import type { BotPermissions } from "./BotPermissions";
import type { UserPermissions } from "./UserPermissions";
import type { UserPermissionsMenuFlow } from "./UserPermissionsMenuFlow";

export interface BasePluginObjectHandlePermissionChecksOptions {
	/**
	 * Should check bot permissions?
	 * @default true
	 */
	checkBotPermissions?: boolean;
	/**
	 * Should check user permissions?
	 * @default true
	 */
	checkUserPermissions?: boolean;

	botPermissions?: BotPermissions;
	userPermissions?: UserPermissions;
}

export interface BasePluginObjectHandlePermissionChecksMenuFlowOptions
	extends BasePluginObjectHandlePermissionChecksOptions {
	userPermissions?: UserPermissionsMenuFlow;
}
