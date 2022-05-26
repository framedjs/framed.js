import type { BasePluginObjectOptions } from "./BasePluginObjectOptions";
import type { UserPermissionsMenuFlow } from "./UserPermissionsMenuFlow";

export interface BaseDiscordMenuFlowOptions extends BasePluginObjectOptions {
	userPermissions?: UserPermissionsMenuFlow;

	/** The menu flow tries to import scripts from paths found in this object. */
	paths: {
		pages: string;
	};
}
