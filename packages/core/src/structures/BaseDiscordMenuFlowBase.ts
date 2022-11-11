import { BaseDiscordMenuFlowPageRenderOptions } from "../interfaces/BaseDiscordMenuFlowPageRenderOptions";
import { BaseMessage } from "./BaseMessage";
import { BasePluginObject } from "./BasePluginObject";
import { oneLine } from "common-tags";
import { Logger } from "@framedjs/logger";

import type { BasePluginObjectHandlePermissionChecksOptions } from "../interfaces/BasePluginObjectHandlePermissionChecksOptions";
import type {
	BotPermissionAllowedData,
	BotPermissionDeniedData,
} from "../interfaces/BotPermissionData";
import type { DiscordMenuFlowIdData } from "../interfaces/DiscordMenuFlowIdData";
import type {
	UserPermissionAllowedData,
	UserPermissionDeniedData,
} from "../interfaces/UserPermissionData";
import type { UserPermissionsMenuFlow } from "../interfaces/UserPermissionsMenuFlow";

export abstract class BaseDiscordMenuFlowBase extends BasePluginObject {
	/** User permissions needed to run the menu flow page. */
	userPermissions?: UserPermissionsMenuFlow;

	/**
	 * Handles permission checking if both the user and bot can run a command.
	 *
	 * @param msg BaseMessage object
	 * @param options Options for handling
	 * @param pageRenderOptions Page render options
	 * @returns `true` if passed permission checks
	 */
	async handlePermissionChecks(
		msg: BaseMessage,
		options: BasePluginObjectHandlePermissionChecksOptions | undefined,
		pageRenderOptions: BaseDiscordMenuFlowPageRenderOptions
	) {
		if (options?.checkBotPermissions) {
			let data: BotPermissionAllowedData | BotPermissionDeniedData;
			data = await this.checkBotPermissions(msg);
			if (!data.success) {
				const sent =
					await BasePluginObject.sendBotPermissionErrorMessage(
						msg,
						this.botPermissions,
						data
					);
				if (!sent) {
					Logger.error(oneLine`"${this.id}" tried to send
					a user permission error message, but something went wrong!`);
				}
				return false;
			}
		}

		if (options?.checkUserPermissions) {
			const data = this.checkUserPermissions(
				msg,
				this.userPermissions,
				pageRenderOptions
			);

			if (!data.success) {
				const sent =
					await BasePluginObject.sendUserPermissionErrorMessage(
						msg,
						this.userPermissions,
						data,
						this
					);
				if (!sent) {
					Logger.error(oneLine`"${this.id}" tried to send
					a user permission error message, but something went wrong!`);
				}
				return false;
			}
		}

		return true;
	}

	/**
	 * Shows data for if a user has a permission to do something.
	 *
	 * @remarks If `userPermissions` is `undefined`, this will return a success.
	 *
	 * @param msg BaseMessage
	 * @param userPermissions User permissions
	 * @returns User permission allowed or denied data
	 */
	checkUserPermissions(
		msg: BaseMessage,
		userPermissions = this.userPermissions,
		options?: DiscordMenuFlowIdData
	): UserPermissionAllowedData | UserPermissionDeniedData {
		if (userPermissions?.discord?.checkOriginalUser != false) {
			if (options?.userId != msg.discord?.author.id) {
				return {
					success: false,
					reasons: ["discordUserMenuFlow"],
					msg,
				};
			}
		}

		return super.checkUserPermissions(msg, userPermissions);
	}
}
