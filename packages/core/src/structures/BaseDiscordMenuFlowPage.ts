import { BaseCommand } from "./BaseCommand";
import { BaseDiscordMenuFlow } from "./BaseDiscordMenuFlow";
import { BaseMessage } from "./BaseMessage";
import { BasePluginObject } from "./BasePluginObject";
import { BasePlugin } from "./BasePlugin";
import { DiscordInteraction } from "./DiscordInteraction";
import Discord from "discord.js";
import { ImportError } from "./errors/non-friendly/ImportError";
import LZString from "lz-string";

import type { BaseDiscordMenuFlowPageOptions } from "../interfaces/BaseDiscordMenuFlowPageOptions";
import type { BaseDiscordMenuFlowPageRenderOptions } from "../interfaces/BaseDiscordMenuFlowPageRenderOptions";
import type { BotPermissions } from "../interfaces/BotPermissions";
import type { DiscordMenuFlowIdData } from "../interfaces/DiscordMenuFlowIdData";
import type { UserPermissionsMenuFlow } from "../interfaces/UserPermissionsMenuFlow";
import type {
	UserPermissionAllowedData,
	UserPermissionDeniedData,
} from "../interfaces/UserPermissionData";

export abstract class BaseDiscordMenuFlowPage extends BasePluginObject {
	plugin: BasePlugin;

	/** Indicates what kind of plugin object this is. */
	type: "menuflowpage" = "menuflowpage";

	/** Bot permissions needed to run the menu flow page. */
	botPermissions?: BotPermissions;

	/** User permissions needed to run the menu flow page. */
	userPermissions?: UserPermissionsMenuFlow;

	constructor(
		readonly menu: BaseDiscordMenuFlow,
		options: BaseDiscordMenuFlowPageOptions
	) {
		super(menu instanceof BasePlugin ? menu : menu.plugin, options);
		if (menu instanceof BasePlugin) {
			throw new ImportError("Attempted to import page as menu");
		}

		this.id = options.id;
		this.plugin = menu.plugin;

		this.fullId = `${menu.plugin.id}.${this.type}.${menu.id}.${this.id}`;
	}

	async parse(
		msg: DiscordInteraction,
		options?: DiscordMenuFlowIdData
	): Promise<BaseDiscordMenuFlowPageRenderOptions | undefined> {
		if (!options && msg instanceof DiscordInteraction) {
			const interaction = msg.discordInteraction.interaction;
			if (interaction.isMessageComponent()) {
				options = this.menu.parseId(interaction.customId);
			}
		}

		return options;
	}

	abstract render(
		msg: DiscordInteraction,
		options?: BaseDiscordMenuFlowPageRenderOptions
	): Promise<boolean>;

	/**
	 * Shows data for if a user has a permission to do something.
	 *
	 * NOTE: If userPermissions is undefined, this will return a success.
	 *
	 * @param msg
	 * @param userPermissions
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
				};
			}
		}

		return BaseCommand.checkUserPermissions(msg, userPermissions);
	}

	/**
	 * Checks for if a user has the permission to do something.
	 *
	 * NOTE: If userPermissions is undefined, this returns true.
	 *
	 * @param msg
	 * @param userPermissions
	 * @param checkAdmin
	 * @param checkOwner
	 */
	hasUserPermission(
		msg: BaseMessage,
		userPermissions = this.userPermissions
	): boolean {
		return BaseCommand.checkUserPermissions(msg, userPermissions).success;
	}

	/**
	 * Sends an error message, with what permissions the user needs to work with.
	 *
	 * @param msg
	 * @param permissions
	 * @param deniedData
	 * @returns
	 */
	async sendUserPermissionErrorMessage(
		msg: BaseMessage,
		permissions = this.userPermissions,
		deniedData = this.checkUserPermissions(msg, permissions),
		editReply?: boolean
	): Promise<boolean> {
		return BaseCommand.sendUserPermissionErrorMessage(
			msg,
			permissions,
			deniedData,
			this,
			editReply
		);
	}

	/**
	 * Generates debug text, containing info about custom IDs
	 * @param id - Custom ID
	 * @param components - Discord components
	 * @returns
	 */
	getDebugContent(
		id: string,
		components?: Discord.MessageActionRowComponent[]
	): string {
		const isProduction = process.env.NODE_ENV == "production";
		const rawEnvShowDebugContent =
			process.env.FRAMED_SHOW_DEBUG_INTERACTION_CONTENT?.toLowerCase();
		const envShowDebugContent =
			rawEnvShowDebugContent == "true"
				? true
				: rawEnvShowDebugContent == "false"
				? false
				: undefined;

		const showDebugContent = envShowDebugContent && !isProduction;
		if (!showDebugContent) return "";

		function getIdRender(id: string, type = "for customId") {
			let base = `\n\`${id}\`, ${id.length} char(s) ${type}`;
			if (id.startsWith(BaseDiscordMenuFlow.lzStringFlag)) {
				const newId = LZString.decompressFromUTF16(
					id.slice(BaseDiscordMenuFlow.lzStringFlag.length, id.length)
				);
				if (newId) {
					base += `\n\`${newId}\`, ${newId.length} char(s) for lz-string decompress`;
				}
			}
			return `${base}\n`;
		}

		let base = `${getIdRender(id).trim()}\n`;
		if (
			components &&
			process.env.FRAMED_SHOW_COMPONENT_DEBUG_INTERACTION_CONTENT?.toLowerCase() ==
				"true"
		) {
			for (const component of components) {
				if (component.customId == null) continue;
				base += getIdRender(component.customId, `- ${component.type}`);
			}
		}
		return `${base}\n`;
	}
}
