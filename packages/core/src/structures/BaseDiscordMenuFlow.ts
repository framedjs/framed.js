import { BaseDiscordMenuFlowPage } from "../structures/BaseDiscordMenuFlowPage";
import { BasePlugin } from "../structures/BasePlugin";
import { BasePluginObject } from "./BasePluginObject";
import { DiscordInteraction } from "../structures/DiscordInteraction";
import { DiscordMessage } from "../structures/DiscordMessage";
import { Utils } from "@framedjs/shared";
import { InternalError } from "./errors/InternalError";
import { Logger } from "@framedjs/logger";
import { PageNotFoundError } from "./errors/PageNotFoundError";
import { stripIndents } from "common-tags";
import Discord from "discord.js";
import lz4 from "lz-string";

import type { BaseDiscordMenuFlowOptions } from "../interfaces/BaseDiscordMenuFlowOptions";
import type { BaseDiscordMenuFlowPageRenderOptions } from "../interfaces/BaseDiscordMenuFlowPageRenderOptions";
import type { BaseDiscordMenuFlowSelectMenuHandleOptions } from "../interfaces/BaseDiscordMenuFlowSelectMenuHandleOptions";
import type { BaseDiscordMenuFlowSelectMenuReturnOptions } from "../interfaces/BaseDiscordMenuFlowSelectMenuReturnOptions";
import type { DiscordMenuFlowIdData } from "../interfaces/DiscordMenuFlowIdData";
import type { DiscordMenuFlowParseIdData } from "../interfaces/DiscordMenuFlowParseIdData";
import type { RequireAllOptions } from "@framedjs/shared";
import type { UserPermissionsMenuFlow } from "../interfaces/UserPermissionsMenuFlow";

export abstract class BaseDiscordMenuFlow extends BasePluginObject {
	readonly rawId: string;
	readonly idInteractionFlag = "i";
	readonly idMessageFlag = "m";

	static readonly lzStringFlag = "LZ-";

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
	 * @param secondaryText Arguments after the ID, which are separated by "_" characters.
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
			const args = secondaryText?.split("_") ?? [];
			if (options?.pageNumber != undefined) {
				args[0] = `${args[0]}.${options.pageNumber}`;
			}
			template += args.join("_");
		}

		const forceMenuFlowCustomIdCompression =
			process.env.FRAMED_FORCE_MENU_FLOW_CUSTOM_ID_COMPRESSION?.toLowerCase() ==
			"true";
		if (forceMenuFlowCustomIdCompression || template.length > 100) {
			const parseInto = `${
				BaseDiscordMenuFlow.lzStringFlag
			}${lz4.compressToUTF16(template)}`;
			if (parseInto.length > 100) {
				Logger.error(`customId is too big to compress: ${template}`);
				throw new InternalError(`\`customId\` is too big to compress.`);
			}
			return parseInto;
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
		if (
			!args[0] ||
			(!customId.startsWith(BaseDiscordMenuFlow.lzStringFlag) &&
				!args[0].startsWith(this.rawId))
		) {
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
		// If it starts with "LZ-", handle it with lz-string
		if (customId.startsWith(this.lzStringFlag)) {
			const parseOut = lz4.decompressFromUTF16(
				customId.slice(
					BaseDiscordMenuFlow.lzStringFlag.length,
					customId.length
				)
			);
			if (parseOut == null) {
				throw new InternalError(
					"Failed to decompress customId string."
				);
			}
			return this.parseId(parseOut);
		}

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

	/**
	 * @deprecated
	 */
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

	async handleSelectMenu(
		msg: DiscordMessage | DiscordInteraction,
		customId: string,
		options: BaseDiscordMenuFlowPageRenderOptions,
		handleOptions: BaseDiscordMenuFlowSelectMenuHandleOptions
	): Promise<BaseDiscordMenuFlowSelectMenuReturnOptions> {
		let passthrough = true;
		let error: PageNotFoundError | undefined;

		const handlePage = async (
			page: BaseDiscordMenuFlowPage,
			msg: DiscordInteraction,
			interaction: Discord.SelectMenuInteraction
		) => {
			const args = interaction.values[0].split("_");
			if (args[0] != customId) {
				return {
					renderResult: await page.render(
						msg,
						await page.parse(msg, { ...options, pageNumber: 1 })
					),
				};
			}

			return {
				passthrough: true,
			};
		};

		if (msg instanceof DiscordInteraction) {
			const interaction = msg.discordInteraction.interaction;
			if (interaction.isSelectMenu()) {
				passthrough = false;

				const args = interaction.values[0].split("_");
				const foundPage = this.pages.get(args[0]);

				if (!foundPage) {
					if (handleOptions.returnPageNotFoundError) {
						error = new PageNotFoundError(
							`The page with ID "${interaction.values[0]}" wasn't found.`
						);
					} else {
						await this.send(
							msg,
							{
								content:
									`**Internal Error**\n` +
									`The page with ID "${interaction.values[0]}" wasn't found.`,
								components: [
									new Discord.MessageActionRow().addComponents(
										this.getBackButton(options)
									),
								],
								embeds: [],
								ephemeral: true,
							},
							msg.discord.author.id != options.userId
						);
					}
				} else {
					return handlePage(foundPage, msg, interaction);
				}
			}
		}

		return {
			pageNotFoundError: error,
			passthrough: error != undefined ? false : passthrough,
		};
	}

	/**
	 * A message send helper.
	 * @param msg
	 * @param messageOptions
	 * @param replyEphemeral
	 */
	async send(
		msg: DiscordMessage | DiscordInteraction,
		messageOptions:
			| string
			| Discord.MessageOptions
			| Discord.MessagePayload
			| Discord.InteractionReplyOptions,
		replyEphemeral?: boolean,
		debugData?: {
			page: BaseDiscordMenuFlowPage;
			dataOptions: DiscordMenuFlowIdData;
		}
	) {
		// Get debug text
		let debugContent: string | undefined;
		if (
			!(typeof messageOptions == "string") &&
			"components" in messageOptions &&
			debugData
		) {
			messageOptions.content = debugContent =
				debugData.page.getDebugContent(
					debugData.dataOptions,
					messageOptions.components as any,
					true
				);
		}

		try {
			if (
				msg instanceof DiscordInteraction &&
				msg.discordInteraction.interaction.isMessageComponent() &&
				replyEphemeral
			) {
				await msg.discordInteraction.interaction.reply(
					messageOptions as any
				);
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
