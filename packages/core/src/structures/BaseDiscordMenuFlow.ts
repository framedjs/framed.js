import { BaseDiscordMenuFlowPage } from "../structures/BaseDiscordMenuFlowPage";
import { BasePlugin } from "../structures/BasePlugin";
import { BasePluginObject } from "./BasePluginObject";
import { DiscordInteraction } from "../structures/DiscordInteraction";
import { DiscordMessage } from "../structures/DiscordMessage";
import { Utils } from "@framedjs/shared";
import { InternalError } from "./errors/InternalError";
import { Logger } from "@framedjs/logger";
import Discord from "discord.js";

import type { BaseDiscordMenuFlowOptions } from "../interfaces/BaseDiscordMenuFlowOptions";
import type { BaseDiscordMenuFlowPageRenderOptions } from "../interfaces/BaseDiscordMenuFlowPageRenderOptions";
import type { DiscordMenuFlowIdData } from "../interfaces/DiscordMenuFlowIdData";
import type { DiscordMenuFlowParseIdData } from "../interfaces/DiscordMenuFlowParseIdData";
import type { RequireAllOptions } from "@framedjs/shared";
import type { UserPermissionsMenuFlow } from "../interfaces/UserPermissionsMenuFlow";
import { oneLine, stripIndents } from "common-tags";
import { DiscordUtils } from "../utils/discord/DiscordUtils";
import { FriendlyError } from "./errors/FriendlyError";

export abstract class BaseDiscordMenuFlow extends BasePluginObject {
	readonly rawId: string;
	readonly idInteractionFlag = "i";
	readonly idMessageFlag = "m";

	/** Indicates what kind of plugin object this is. */
	type: "menuflow" = "menuflow";

	/** User permissions needed to run the menu flow page. */
	userPermissions?: UserPermissionsMenuFlow;

	pages = new Map<string, BaseDiscordMenuFlowPage>();

	/** The menu flow tries to import scripts from paths found in this object. */
	paths: {
		pages: string;
	};

	constructor(plugin: BasePlugin, options: BaseDiscordMenuFlowOptions) {
		super(plugin, options);

		this.rawId = options.id;
		this.paths = options.paths;

		this.fullId = `${plugin.id}.${this.type}.${this.id}`;
	}

	abstract start(msg: DiscordMessage | DiscordInteraction): Promise<void>;

	getPage(id: string): BaseDiscordMenuFlowPage {
		const page = this.pages.get(id);
		if (!page) {
			throw new InternalError(`Page with ID "${id}" was not found!`);
		}
		return page;
	}

	/**
	 * Appends an i or m to the rawId, depending on if BaseMessage is
	 * a Discord interaction, or a Discord message respectively.
	 * @param options
	 * @returns ID
	 */
	getBaseId(options?: DiscordMenuFlowIdData): string {
		return options?.ephemeral
			? `${this.rawId}${this.idInteractionFlag}`
			: `${this.rawId}${this.idMessageFlag}`;
	}

	/**
	 * Creates a data ID string, used for customIds in Discord interactions.
	 * @param options
	 * @param secondaryText Base and arbitrary text to append to at the end of everything else.
	 * @returns Data ID
	 */
	getDataId(options?: DiscordMenuFlowIdData, secondaryText?: string): string {
		let template = `${this.getBaseId(options)}_`;

		const letterTagData: string[] = [];

		if (options?.guildId) {
			letterTagData.push(`g:${options.guildId}`);
		}
		if (options?.channelId) {
			letterTagData.push(`c:${options.channelId}`);
		}
		if (options?.messageId) {
			letterTagData.push(`m:${options.messageId}`);
		}
		if (options?.userId) {
			letterTagData.push(`u:${options.userId}`);
		}

		for (let i = 0; i < letterTagData.length; i++) {
			const element = letterTagData[i];
			template += `${element}`;

			// Make sure there is no trailing "_" char
			if (i + 1 < letterTagData.length || secondaryText?.length != 0) {
				template += `_`;
			}
		}

		if (secondaryText) {
			const args = secondaryText.split("_");
			if (options?.pageNumber != undefined) {
				args[0] = `${args[0]}.${options.pageNumber}`;
				template += args.join("_");
			} else {
				template += secondaryText;
			}
		}

		return template;
	}

	parseId(customId: string): DiscordMenuFlowParseIdData;
	parseId(
		customId: string,
		doNotCrashIfInvalidId: boolean
	): DiscordMenuFlowParseIdData | undefined;

	parseId(
		customId: string,
		doNotCrashIfInvalidId = false
	): DiscordMenuFlowParseIdData | undefined {
		const args = customId.split("_");
		if (!args[0] || !args[0].startsWith(this.rawId)) {
			if (doNotCrashIfInvalidId) return;

			throw new InternalError(
				stripIndents`customID is invalid.
				> customId: \`${customId}\`
				> rawId: \`${this.rawId}\``
			);
		}

		return BaseDiscordMenuFlow.parseId(customId);
	}

	static parseId(customId: string): DiscordMenuFlowParseIdData {
		const args = customId.split("_");

		let guildId: string | undefined;
		let channelId: string | undefined;
		let messageId: string | undefined;
		let userId: string | undefined;
		for (let i = 1; i < args.length; i++) {
			const element = args[i];
			const letterTag = element.substring(0, 2);
			let notMatching = false;

			switch (letterTag) {
				case "g:":
				case "c:":
				case "m:":
				case "u:": {
					const tempId = element.substring(2, element.length);
					delete args[i];

					if (letterTag == "g:") {
						guildId = tempId;
					} else if (letterTag == "c:") {
						channelId = tempId;
					} else if (letterTag == "m:") {
						messageId = tempId;
					} else if (letterTag == "u:") {
						userId = tempId;
					}
					break;
				}
				default:
					notMatching = true;
					break;
			}

			if (notMatching) {
				break;
			}
		}

		const filteredArgs = args.filter(Boolean);
		const pageNumberString = filteredArgs[1]?.split(".")[1] ?? undefined;
		const pageNumber =
			pageNumberString && !Number.isNaN(Number(pageNumberString))
				? Number(pageNumberString)
				: undefined;

		return {
			args: filteredArgs,
			pageNumber: pageNumber,
			ephemeral: filteredArgs[0]
				? filteredArgs[0][filteredArgs[0].length - 1] == "i"
				: false,
			guildId,
			channelId,
			messageId,
			userId: userId,
		};
	}

	getBackButton(
		options?: BaseDiscordMenuFlowPageRenderOptions,
		secondaryId = "base"
	): Discord.MessageButton {
		const newId = this.getDataId(options, secondaryId);
		return new Discord.MessageButton()
			.setCustomId(newId)
			.setLabel("Back")
			.setStyle("SECONDARY");
	}

	getCloseButton(
		options?: BaseDiscordMenuFlowPageRenderOptions,
		secondaryId = "close"
	): Discord.MessageButton {
		const newId = this.getDataId(options, secondaryId);
		return new Discord.MessageButton()
			.setCustomId(newId)
			.setLabel("Close")
			.setStyle("SECONDARY");
	}

	async handleUserCheck(
		msg: DiscordMessage | DiscordInteraction,
		options: DiscordMenuFlowIdData
	): Promise<{
		replyEphemeral: boolean;
	}> {
		return {
			replyEphemeral: msg.discord.author.id != options.userId,
		};
	}

	//#region Loading pages

	loadPagesIn(options: RequireAllOptions): void {
		const pages = Utils.importScripts(options) as (new (
			menu: BaseDiscordMenuFlow
		) => BaseDiscordMenuFlowPage)[];
		this.loadPages(pages);
	}

	loadPages<T extends BaseDiscordMenuFlowPage>(
		pages: (new (menu: BaseDiscordMenuFlow) => T)[]
	): void {
		for (const menu of pages) {
			const initSubcommand = new menu(this);
			this.loadPage(initSubcommand);
		}
	}

	loadPage<T extends BaseDiscordMenuFlowPage>(page: T): void {
		// Sets up the page into the Map
		if (this.pages.get(page.id)) {
			Logger.error(`Page with id "${page.id}" already exists!`);
			return;
		}
		this.pages.set(page.id, page);

		Logger.debug(`Loaded page "${page.id}"`);
	}

	//#endregion
}
