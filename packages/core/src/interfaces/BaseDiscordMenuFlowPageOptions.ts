import type { BasePluginObjectOptions } from "./BasePluginObjectOptions";
import type { UserPermissionsMenuFlow } from "./UserPermissionsMenuFlow";

export interface BaseDiscordMenuFlowPageOptions
	extends BasePluginObjectOptions {
	id: string;

	userPermissions?: UserPermissionsMenuFlow;
}
