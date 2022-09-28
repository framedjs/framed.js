import { BaseCommand } from "./BaseCommand";
import { BaseDiscordMenuFlow } from "./BaseDiscordMenuFlow";
import { BaseMessage } from "./BaseMessage";
import { BasePluginObject } from "./BasePluginObject";
import { BasePlugin } from "./BasePlugin";
import { DiscordInteraction } from "./DiscordInteraction";
import { DiscordMessage } from "./DiscordMessage";
import Discord from "discord.js";
import { ImportError } from "./errors/non-friendly/ImportError";
import LZString from "lz-string";
import { Logger } from "@framedjs/logger";

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
					msg,
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
	 * A message send helper.
	 * @param msg
	 * @param messageOptions
	 * @param dataOptions
	 * @param reply If true, replies instead of edits
	 */
	async send(
		msg: DiscordMessage | DiscordInteraction,
		messageOptions:
			| string
			| Discord.MessageOptions
			| Discord.MessagePayload
			| Discord.InteractionReplyOptions,
		dataOptions: DiscordMenuFlowIdData,
		reply?: boolean
	) {
		// Get debug text
		let debugContent: string | undefined;
		if (
			!(typeof messageOptions == "string") &&
			"components" in messageOptions
		) {
			debugContent = this.getDebugContent(
				dataOptions,
				messageOptions.components
			);
			messageOptions.content = `${debugContent ?? ""}${
				messageOptions.content ?? ""
			}`;

			if (messageOptions.content.length == 0) {
				messageOptions.content = undefined;
			}
		}

		try {
			if (reply) {
				if (
					msg instanceof DiscordInteraction &&
					msg.discordInteraction.interaction.isRepliable()
				) {
					if (msg.discordInteraction.interaction.replied) {
						await msg.discordInteraction.interaction.followUp(
							messageOptions as any
						);
					} else {
						await msg.discordInteraction.interaction.reply(
							messageOptions as any
						);
					}
				} else if (msg instanceof DiscordMessage) {
					if (msg.discord.msg) {
						await msg.discord.msg.reply(messageOptions as any);
					} else {
						await msg.discord.channel.send(messageOptions as any);
					}
				} else {
					Logger.warn(
						new Error("Using fallback to output repliable message")
							.stack
					);
					await msg.send(messageOptions as any);
				}
			} else {
				await msg.send(messageOptions as any);
			}
		} catch (error) {
			const err = error as Error;
			if (
				err.message.startsWith("Invalid Form Body\ncomponents") &&
				debugContent
			) {
				Logger.error(`Form Body Data:\n${debugContent.trim()}`);
			}
			throw error;
		}
	}

	/**
	 * Generates debug text, containing info about custom IDs
	 * @param id Custom ID
	 * @param components Discord components
	 * @param showDebugInteractionContent Defaults to FRAMED_SHOW_DEBUG_INTERACTION_CONTENT environment variable being "true".
	 */
	getDebugContent(
		id: string | DiscordMenuFlowIdData,
		components?:
			| Discord.MessageActionRowComponent[]
			| (
					| Discord.MessageActionRow
					| (Required<Discord.BaseMessageComponentOptions> &
							Discord.MessageActionRowOptions)
			  )[]
			| Discord.MessageActionRow,
		showDebugInteractionContent = process.env.FRAMED_SHOW_DEBUG_INTERACTION_CONTENT?.toLocaleLowerCase() ==
			"true"
	): string | undefined {
		const isProduction = process.env.NODE_ENV == "production";
		const showDebugContent = showDebugInteractionContent && !isProduction;
		if (!showDebugContent) return undefined;

		const newId =
			typeof id == "string" ? id : this.menu.getDataId(id, this.id);
		const debugIdRender = this._getDebugIdRender(newId).trim();
		const componentRender = this._getDebugContentFromComponents(components);

		let base = `${debugIdRender}\n${componentRender}`;
		return base;
	}

	private _getDebugIdRender(id: string, type = "for customId") {
		let base = `\n\`${id.replace(/`/g, "\\`")}\`, ${
			id.length
		} char(s) ${type}`;
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

	private _getDebugContentFromComponents(
		components?:
			| Discord.MessageActionRowComponent[]
			| (
					| Discord.MessageActionRow
					| (Required<Discord.BaseMessageComponentOptions> &
							Discord.MessageActionRowOptions)
			  )[]
			| Discord.MessageActionRow,
		showDebugInteractionContent = process.env.FRAMED_SHOW_COMPONENT_DEBUG_INTERACTION_CONTENT?.toLocaleLowerCase() ==
			"true"
	) {
		let base = "";
		if (components && showDebugInteractionContent) {
			let parsableComponents: (
				| Discord.MessageActionRowComponent
				| Discord.MessageActionRowComponentResolvable
			)[] = [];

			if ("components" in components) {
				parsableComponents.push(...components.components);
			} else {
				for (const component of components) {
					component.type == "ACTION_ROW"
						? parsableComponents.push(...component.components)
						: parsableComponents.push(component);
				}
			}

			for (const component of parsableComponents) {
				if ("customId" in component) {
					if (component.customId == null) continue;
					base += this._getDebugIdRender(
						component.customId,
						`- ${component.type}`
					);
				}
			}
		}
		if (base) {
			return `${base}\n`;
		} else {
			return "";
		}
	}
}
