import { BaseCommand } from "./BaseCommand";
import { BaseDiscordMenuFlow } from "./BaseDiscordMenuFlow";
import { BaseDiscordMenuFlowBase } from "./BaseDiscordMenuFlowBase";
import { BaseMessage } from "./BaseMessage";
import { BasePlugin } from "./BasePlugin";
import { DiscordInteraction } from "./DiscordInteraction";
import { DiscordMessage } from "./DiscordMessage";
import { FriendlyError } from "./errors/FriendlyError";
import { ImportError } from "./errors/non-friendly/ImportError";
import { Logger } from "@framedjs/logger";
import Discord from "discord.js";
import lz4 from "lz-string";

import type { BaseDiscordMenuFlowPageOptions } from "../interfaces/BaseDiscordMenuFlowPageOptions";
import type { BaseDiscordMenuFlowPageRenderOptions } from "../interfaces/BaseDiscordMenuFlowPageRenderOptions";
import type { DiscordMenuFlowIdData } from "../interfaces/DiscordMenuFlowIdData";
import type { DiscordInteractionSendOptions } from "../interfaces/DiscordInteractionSendOptions";
import type { HandleFriendlyErrorOptions } from "../interfaces/HandleFriendlyErrorOptions";

export abstract class BaseDiscordMenuFlowPage extends BaseDiscordMenuFlowBase {
	/** Indicates what kind of plugin object this is. */
	type: "menuflowpage" = "menuflowpage";

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
	 * Checks for if a user has the permission to do something.
	 *
	 * NOTE: If userPermissions is undefined, this returns true.
	 *
	 * @param msg
	 * @param userPermissions
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
	 * @param extraOptions
	 */
	async send(
		msg: DiscordMessage | DiscordInteraction,
		messageOptions:
			| string
			| Discord.MessageReplyOptions
			| Discord.MessageCreateOptions
			| Discord.MessagePayload
			| Discord.InteractionReplyOptions,
		dataOptions: DiscordMenuFlowIdData,
		extraOptions?: DiscordInteractionSendOptions
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

			// If there's no debug content, don't
			// mess with message contents
			if (debugContent) {
				messageOptions.content = `${debugContent ?? ""}${
					messageOptions.content ?? ""
				}`;

				if (messageOptions.content.length == 0) {
					messageOptions.content = undefined;
				}
			}
		}

		try {
			if (extraOptions?.editReply == false) {
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
	 * Handles errors and {@link FriendlyError}s.
	 *
	 * @remarks handleOptions.ephemeral will default to dataOptions.ephemeral
	 *
	 * @param msg
	 * @param error
	 * @param handleOptions
	 * @param dataOptions
	 * @returns
	 */
	async handleError(
		msg: DiscordMessage | DiscordInteraction,
		error: unknown,
		handleOptions?: HandleFriendlyErrorOptions,
		dataOptions?: BaseDiscordMenuFlowPageRenderOptions & {
			backButtonId?: string;
		}
	) {
		if (
			error instanceof FriendlyError &&
			msg instanceof DiscordInteraction &&
			dataOptions
		) {
			const newHandleOptions = {
				...handleOptions,
				ephemeral:
					"customId" in msg.discordInteraction.interaction
						? this.menu.parseId(
								msg.discordInteraction.interaction.customId
						  ).ephemeral
						: handleOptions?.ephemeral,
			};
			const messageOptions =
				await msg.client.commands.getFriendlyErrorMessageOptions(
					msg,
					error,
					newHandleOptions
				);
			if (messageOptions) {
				if (!messageOptions.components) {
					messageOptions.components = [];
				}
				messageOptions.components.push(
					new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(
						this.menu.getBackButton(
							dataOptions,
							dataOptions.backButtonId
						)
					)
				);
			}
			await msg.client.commands.sendErrorMessage(msg, error, {
				...newHandleOptions,
				messageOptions,
			});
			return;
		} else if (
			error instanceof FriendlyError &&
			msg instanceof DiscordInteraction
		) {
			Logger.warn(
				`No dataOptions passed, defaulting to base handleError()...`
			);
		}

		await msg.client.commands.handleError(msg, error, handleOptions);
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
			| Discord.ActionRowBuilder
			| Discord.ActionRowBuilder[]
			| (
					| Discord.JSONEncodable<
							Discord.APIActionRowComponent<Discord.APIMessageActionRowComponent>
					  >
					| Discord.ActionRowData<
							| Discord.MessageActionRowComponentData
							| Discord.MessageActionRowComponentBuilder
					  >
					| Discord.APIActionRowComponent<Discord.APIMessageActionRowComponent>
			  )[],
		showDebugInteractionContent = process.env.FRAMED_SHOW_DEBUG_INTERACTION_CONTENT?.toLocaleLowerCase() ==
			"true"
	): string | undefined {
		const isProduction = process.env.NODE_ENV == "production";
		const showDebugContent = showDebugInteractionContent && !isProduction;
		if (!showDebugContent) return undefined;

		const newId =
			typeof id == "string" ? id : this.menu.getDataId(id, this.id);
		const debugIdRender = this._getDebugIdRender(newId).trim();

		let tempComponents = components;
		if (tempComponents instanceof Discord.ActionRowBuilder) {
			tempComponents = [tempComponents];
		}
		const componentRender =
			this._getDebugContentFromComponents(tempComponents);

		let base = `${debugIdRender}\n${componentRender}`;
		return base;
	}

	private _getDebugIdRender(id: string, type = "for customId") {
		let base = `\n\`${id.replace(/`/g, "\\`")}\`, ${
			id.length
		} char(s) ${type}`;
		if (id.startsWith(BaseDiscordMenuFlow.lzStringFlag)) {
			const newId = lz4.decompressFromUTF16(
				id.slice(BaseDiscordMenuFlow.lzStringFlag.length, id.length)
			);
			if (newId) {
				base += `\n\`${newId}\`, ${newId.length} char(s) for lz-string decompress\n`;
			}
		}
		return base;
	}

	private _getDebugContentFromComponents(
		components?:
			| Discord.ActionRowBuilder[]
			| (
					| Discord.JSONEncodable<
							Discord.APIActionRowComponent<Discord.APIMessageActionRowComponent>
					  >
					| Discord.ActionRowData<
							| Discord.MessageActionRowComponentData
							| Discord.MessageActionRowComponentBuilder
					  >
					| Discord.APIActionRowComponent<Discord.APIMessageActionRowComponent>
			  )[],
		showDebugInteractionContent = process.env.FRAMED_SHOW_COMPONENT_DEBUG_INTERACTION_CONTENT?.toLocaleLowerCase() ==
			"true"
	) {
		let base = "";
		if (components && showDebugInteractionContent) {
			let parsableComponents: // From first if statement in for loop
			(
				| Discord.APIButtonComponentWithCustomId
				// | Discord.MessageActionRowComponentData
				// | Discord.MessageActionRowComponentBuilder
				// From second if statement
				| Discord.APIButtonComponentWithCustomId
				| Discord.APISelectMenuComponent
				| Discord.APITextInputComponent
			)[] = [];

			// if ("toJSON" in components) {
			// 	parsableComponents.push(...components.components);
			// } else {
			for (const component of components) {
				// component.type == Discord.ComponentType.ActionRow
				// 	? parsableComponents.push(...component.components)
				// 	: parsableComponents.push(component);
				if ("components" in component) {
					for (const rawComponent of component.components) {
						if ("toJSON" in rawComponent) {
							const jsonData = rawComponent.toJSON();
							if ("custom_id" in jsonData) {
								parsableComponents.push(jsonData);
							}
						} else if ("custom_id" in rawComponent) {
							parsableComponents.push(rawComponent);
						}
					}
				} else {
					const jsonData = component.toJSON();
					for (const component of jsonData.components) {
						if ("custom_id" in component) {
							parsableComponents.push(component);
						}
					}
				}
			}
			// }

			for (const component of parsableComponents) {
				if ("custom_id" in component) {
					if (component.custom_id == null) continue;
					base += this._getDebugIdRender(
						component.custom_id,
						`- type ${component.type}`
					);
				}
			}
		}
		if (base) {
			return `${base}\n_ _\n`;
		} else {
			return "";
		}
	}
}
