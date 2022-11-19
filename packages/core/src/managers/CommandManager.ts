/* eslint-disable no-mixed-spaces-and-tabs */
import { Base } from "../structures/Base";
import { BaseCommand } from "../structures/BaseCommand";
import { BaseDiscordInteraction } from "../structures/BaseDiscordInteraction";
import { BaseDiscordAutocompleteInteraction } from "../structures/BaseDiscordAutocompleteInteraction";
import { BaseDiscordButtonInteraction } from "../structures/BaseDiscordButtonInteraction";
import { BaseDiscordContextMenuCommandInteraction } from "../structures/BaseDiscordContextMenuCommandInteraction";
import { BaseDiscordMenuFlow } from "../structures/BaseDiscordMenuFlow";
import { BaseDiscordMenuFlowPage } from "../structures/BaseDiscordMenuFlowPage";
import { BaseDiscordMessageComponentInteraction } from "../structures/BaseDiscordMessageComponentInteraction";
import { BaseDiscordSelectMenuInteraction } from "../structures/BaseDiscordSelectMenuInteraction";
import { BaseMessage } from "../structures/BaseMessage";
import { BasePluginObject } from "../structures/BasePluginObject";
import { Client } from "../structures/Client";
import Discord, { PermissionFlagsBits } from "discord.js";
import { DiscordChatInputInteraction } from "../structures/DiscordChatInputInteraction";
import { DiscordInteraction } from "../structures/DiscordInteraction";
import { DiscordMessage } from "../structures/DiscordMessage";
import { EmbedHelper } from "../utils/discord/EmbedHelper";
import { FriendlyError } from "../structures/errors/FriendlyError";
import { InternalError } from "../structures/errors/InternalError";
import { Logger } from "@framedjs/logger";
import { TwitchMessage } from "../structures/TwitchMessage";
import { Utils } from "@framedjs/shared";
import { oneLine, oneLineInlineLists } from "common-tags";
import lzstring from "lz-string";
import util from "util";

import type { BaseDiscordMenuFlowPageRenderOptions } from "../interfaces/BaseDiscordMenuFlowPageRenderOptions";
import type { FoundCommandData } from "../interfaces/FoundCommandData";
import type { HandleFriendlyErrorOptions } from "../interfaces/HandleFriendlyErrorOptions";
import type { Place } from "../interfaces/Place";

export class CommandManager extends Base {
	constructor(client: Client) {
		super(client);
	}

	/**
	 * List of all the default prefixes
	 * @returns String array of default prefixes
	 */
	get defaultPrefixes(): string[] {
		const prefixes: string[] = [
			`<@!${this.client.discord.client?.user?.id}>`,
			`<@${this.client.discord.client?.user?.id}>`,
		];

		// Logger.debug(`Default prefixes: ${prefixes}`);
		return prefixes;
	}

	/**
	 * List of all the base commands from all plugins
	 * @returns BaseCommand array
	 */
	get commandsArray(): BaseCommand[] {
		const commands: BaseCommand[] = [];
		this.client.plugins.map.forEach(plugin => {
			commands.push(...Array.from(plugin.commands.values()));
		});
		return commands;
	}

	/**
	 * List of all possible prefixes for the specific guild or Twitch channel.
	 *
	 * @param place Place data
	 * @param guild Discord Guild, for the role prefix
	 *
	 * @returns String array of all possible prefixes
	 */
	async getPossiblePrefixes(
		place: Place,
		guild?: Discord.Guild | null
	): Promise<string[]> {
		const startTime = process.hrtime();
		const prefixes = this.defaultPrefixes;

		// From commands: adds to the list of potential prefixes (also removes duplicates)
		for (const command of this.commandsArray) {
			const commandPrefixes = command.getPrefixes(place);
			for (const prefix of commandPrefixes) {
				if (!prefixes.includes(prefix)) {
					// Logger.silly(`[${process.hrtime(startTime)}] - ${prefix}`);
					prefixes.push(prefix);
				}
			}
		}

		if (guild && guild.available) {
			try {
				let shouldLog = !guild.members.me;
				const me = await guild.members.fetchMe();

				const rolePrefix = me.roles.botRole?.toString();
				if (rolePrefix) {
					prefixes.push(rolePrefix);
				}

				if (shouldLog && Logger.isSillyEnabled()) {
					Logger.silly(
						`${Utils.hrTimeElapsed(
							startTime
						)}s - Fetched role when getting possible prefixes.`
					);
				}
			} catch (error) {
				Logger.error((error as Error).stack);
			}
		}

		// Logger.silly(
		// 	`${Utils.hrTimeElapsed(
		// 		startTime
		// 	)}s - Finished finding all possible prefixes.`
		// );
		// Logger.silly(process.hrtime(startTime));
		// Logger.silly(`Prefixes: ${prefixes}`);
		return prefixes;
	}

	//#region Getting commands

	/**
	 * Get command data from what was found
	 *
	 * @param msg BaseMessage object
	 * @param place Place data
	 *
	 * @returns Found command data
	 */
	async getFoundCommandData(
		msg: BaseMessage,
		place: Place
	): Promise<FoundCommandData[]>;

	/**
	 * Get command data from what was found
	 *
	 * @param prefix Prefix string
	 * @param command Command ID
	 * @param args Arguments
	 *
	 * @returns Found command data
	 */
	async getFoundCommandData(
		command: string,
		args: string[],
		place: Place,
		prefix?: string
	): Promise<FoundCommandData[]>;

	/**
	 * Get command data from what was found
	 *
	 * @param msgOrCommand BaseMessage object, or command ID
	 * @param argsOrPlace Arguments or place data
	 * @param place Place data
	 * @param prefix Prefix string
	 *
	 * @returns Found command data
	 */
	async getFoundCommandData(
		msgOrCommand: BaseMessage | string,
		argsOrPlace?: string[] | Place,
		place?: Place,
		prefix?: string
	): Promise<FoundCommandData[]> {
		let command = "";
		let args: string[];

		if (msgOrCommand instanceof BaseMessage) {
			prefix = msgOrCommand.prefix;
			command = msgOrCommand.command ?? command;
			args = msgOrCommand.args ?? [];
			place = place ? place : await msgOrCommand.getPlace();
		} else {
			if (!(argsOrPlace instanceof Array)) {
				throw new Error(
					`argsOrPlace must be an Array, if msgOrCommand is a string`
				);
			}

			command = msgOrCommand;
			args = argsOrPlace;

			if (!place) {
				throw new ReferenceError("Variable place is undefined");
			}
		}

		const data: FoundCommandData[] = [];

		// Runs the commands
		let commandList: BaseCommand[] = [];
		if (msgOrCommand instanceof BaseMessage) {
			commandList = this.getCommands(msgOrCommand, place);
		} else {
			commandList = this.getCommands(command, place, prefix);
		}

		for (const command of commandList) {
			data.push({
				command: command,
				subcommands: command.getSubcommandChain(args),
			});
		}

		return data;
	}

	/**
	 * Finds a command, matching a command ID.
	 *
	 * @param command Command ID
	 * @param place Place data
	 * @param prefix Prefix string
	 *
	 * @returns BaseCommand or undefined
	 */
	getCommand(
		command: string,
		place?: Place,
		prefix?: string
	): BaseCommand | undefined;

	/**
	 * Finds a command, matching a message.
	 *
	 * @param msg BaseMessage object
	 * @param place Place data
	 *
	 * @returns BaseCommand or undefined
	 */
	getCommand(msg: BaseMessage, place?: Place): BaseCommand | undefined;

	/**
	 * Finds a command, matching a message or command ID.
	 *
	 * @param msgOrCommand BaseMessage or command string
	 * @param place Place data
	 * @param prefix Prefix string
	 *
	 * @returns BaseCommand or undefined
	 */
	getCommand(
		msgOrCommand: BaseMessage | string,
		place?: Place,
		prefix?: string
	): BaseCommand | undefined {
		if (msgOrCommand instanceof BaseMessage) {
			return this.getCommands(msgOrCommand, place)[0];
		} else {
			return this.getCommands(msgOrCommand, place, prefix)[0];
		}
	}

	/**
	 * Get a list of plugin commands from a message.
	 * This function will also get from a command's alias.
	 *
	 * Optimally, there should be only one command but will allow
	 * overlapping commands from different plugins.
	 *
	 * @param command Command ID
	 * @param place Place data
	 * @param prefix Prefix string
	 *
	 * @returns List of commands with the same ID.
	 */
	getCommands(command: string, place?: Place, prefix?: string): BaseCommand[];

	/**
	 * Get a list of plugin commands from a message.
	 * This function will also get from a command's alias.
	 *
	 * Optimally, there should be only one command but will allow
	 * overlapping commands from different plugins.
	 *
	 * @param msg BaseMessage object
	 * @param place Place data
	 *
	 * @returns List of commands with the same ID.
	 */
	getCommands(msg: BaseMessage, place?: Place): BaseCommand[];

	/**
	 * Get a list of plugin commands from a message.
	 * This function will also get from a command's alias.
	 *
	 * Optimally, there should be only one command but will allow
	 * overlapping commands from different plugins.
	 *
	 * @param msgOrCommand BaseMessage object or command
	 * @param place Place data
	 * @param prefix Prefix string
	 *
	 * @returns List of commands with the same ID.
	 */
	getCommands(
		msgOrCommand: BaseMessage | string,
		place?: Place,
		prefix?: string
	): BaseCommand[] {
		const commandList: BaseCommand[] = [];

		let commandString = "";

		if (msgOrCommand instanceof BaseMessage) {
			if (msgOrCommand.command != undefined) {
				prefix = msgOrCommand.prefix;
				commandString = msgOrCommand.command;
			}
		} else if (typeof msgOrCommand == "string") {
			commandString = msgOrCommand;
		} else {
			return commandList;
		}

		// Tries to the find the command in plugins
		for (const plugin of this.client.plugins.pluginsArray) {
			// Gets the command from the plugin, if it can
			// Subcommands are not allowed to declare new prefixes
			let command = plugin.commands.get(commandString);

			// If not found, check the aliases
			if (command == undefined) {
				// Tries to find the command from an alias
				command = plugin.aliases.get(commandString);
			}

			if (command != undefined) {
				let commandUsesPrefix = true;

				if (msgOrCommand instanceof DiscordInteraction) {
					commandList.push(command);
					continue;
				}

				if (prefix != undefined && place) {
					// Gets all valid prefixes for the place, and command
					const commandPrefixes = command.getPrefixes(place);
					commandPrefixes.push(...this.defaultPrefixes);

					// Gets the base command's prefixes or default prefixes, and see if they match.
					// If there was no prefix defined, ignore prefix checks.
					commandUsesPrefix = commandPrefixes.includes(prefix);
				}

				if (commandUsesPrefix) {
					commandList.push(command);
				}
			}
		}

		return commandList;
	}

	//#endregion

	/**
	 * Runs a command, based on the Message parameters
	 *
	 * @param msg BaseMessage object
	 * @returns Map of all commands by their IDs, and whether they succeeded execution
	 */
	async run(msg: BaseMessage): Promise<Map<string, boolean>> {
		const startTime = process.hrtime();
		const map = new Map<string, boolean>();

		if (msg instanceof DiscordInteraction) {
			try {
				await this.scanAndRunMenuFlowPages(
					msg,
					map,
					{
						errorHandling: "sendAllErrors",
					},
					startTime
				);
			} catch (error) {
				await this.handleFriendlyError(msg, error, {
					sendSeparateReply: false,
				});
			}
		}

		try {
			if (msg.prefix != undefined || msg instanceof DiscordInteraction) {
				try {
					if (
						!(msg instanceof DiscordInteraction) ||
						msg instanceof DiscordChatInputInteraction
					) {
						await this.scanAndRunCommands(msg, map, startTime);
					} else {
						await this.scanAndRunDiscordInteractions(
							msg,
							map,
							startTime
						);
					}
				} catch (error) {
					await this.handleFriendlyError(msg, error, {
						sendSeparateReply: true,
					});
				}
			}
		} catch (error) {
			Logger.error((error as Error).stack);
		}

		if (Logger.isSillyEnabled() && map.size > 0) {
			Logger.silly(
				`${Utils.hrTimeElapsed(
					startTime
				)}s - Finished finding and sending commands`
			);
		}
		return map;
	}

	/**
	 * Should the user be allowed to run a command?
	 * @param msg
	 * @returns `true` if it'll allow the user to run a command, else `false`.
	 */
	shouldAllowUser(msg: BaseMessage) {
		if (
			msg.discord?.author.bot &&
			process.env.FRAMED_ALLOW_BOTS_TO_RUN_COMMANDS?.toLowerCase() !=
				"true"
		) {
			Logger.warn(
				`${msg.discord.author.tag} attempted to run a command, but was a bot! (${msg.content})`
			);
			return false;
		}

		// If for some reason I see this, I'm going to
		if (
			msg.discordInteraction?.user.bot &&
			process.env.FRAMED_ALLOW_BOTS_TO_RUN_COMMANDS?.toLowerCase() !=
				"true"
		) {
			Logger.warn(
				oneLine`${msg.discordInteraction.user.tag} (from discordInteraction)
				attempted to run a command, but was a bot!`
			);
			return false;
		}

		return true;
	}

	/**
	 * If a non-friendly error was passed, it'll be outputted to console
	 *
	 * @param msg BaseMessage object
	 * @param error An Error or FriendlyError object
	 * @param options Friendly error display options
	 */
	async handleFriendlyError(
		msg: BaseMessage,
		error: unknown,
		options?: HandleFriendlyErrorOptions
	): Promise<void> {
		if (error instanceof FriendlyError) {
			try {
				await this.sendErrorMessage(msg, error, options);
			} catch (error) {
				if (options?.catchSendMessage != false) {
					Logger.error((error as Error).stack);
				} else {
					throw error;
				}
			}
		} else {
			if ("errors" in (error as any)) {
				Logger.error(util.inspect(error, undefined, undefined, true));
			} else {
				Logger.error((error as Error).stack);
			}
		}
	}

	/**
	 * Scans for if the BaseMessage object would trigger a command,
	 * and runs those respective commands.
	 *
	 * @param msg BaseMessage object
	 * @param map Map of command IDs as keys, and whether they succeeded execution
	 * @param startTime
	 *
	 * @returns Modified map of what was passed into
	 */
	async scanAndRunCommands(
		msg: BaseMessage,
		map: Map<string, boolean>,
		startTime?: [number, number]
	): Promise<Map<string, boolean>> {
		// Attempts to get the command data from a message, including comparing prefixes
		const data = await this.getFoundCommandData(msg, await msg.getPlace());

		for await (const element of data) {
			if (!this.shouldAllowUser(msg)) {
				break;
			}

			// Attempts to get the subcommand if it exists.
			// If not, use the base command.
			let command = element.command;
			if (element.subcommands.length > 0) {
				command = element.subcommands[element.subcommands.length - 1];
			}

			const permCheck = await this.checkForPermissions(msg, command, map);
			if (!permCheck) {
				continue;
			}

			const cooldownCheck = await this.processCooldownCheck(
				msg,
				command,
				map
			);
			if (!cooldownCheck) {
				continue;
			}

			const displayTime = startTime
				? `${Utils.hrTimeElapsed(startTime)}s - `
				: "";

			if (msg instanceof DiscordMessage) {
				Logger.verbose(
					oneLine`${displayTime}Running command "${msg.content}" from
					user ${msg.discord.author.tag} (${msg.discord.author.id})`
				);
				if (msg.discord.msg?.url) {
					Logger.verbose(
						`URL: ${msg.discord.msg?.url} ${
							msg.discord.channel.isThread() ? " (in thread)" : ""
						}`
					);
				}
			} else if (
				msg instanceof DiscordInteraction &&
				msg.discordInteraction.interaction.isCommand()
			) {
				const interaction = msg.discordInteraction.interaction;
				const options = Utils.util.inspect(interaction.options);

				Logger.verbose(
					oneLine`${displayTime}Running /${interaction.commandName}
					from user ${interaction.user.tag} (${msg.discordInteraction.user.id})
					`
				);

				Logger.verbose(
					oneLine`URL: https://discord.com/channels/${
						interaction.guildId ?? "@me"
					}/${interaction.channelId}
					${msg.discord.channel.isThread() ? " (is thread)" : ""}`
				);

				if (options) {
					Logger.verbose(options);
				}
			} else {
				Logger.verbose(`Running command "${msg.content}"`);
			}

			let success = false;
			if (
				command instanceof BaseDiscordInteraction &&
				msg instanceof DiscordInteraction
			) {
				success = await command.run(
					msg,
					msg.discordInteraction.interaction
				);
			} else {
				success = await (command as BaseCommand).run(msg);
			}

			if (success && command.cooldown?.setAutomatically != false) {
				if (!msg.userId) {
					Logger.error("msg.userId is empty");
				} else {
					await this.setCooldown(msg.userId, command);
				}
			}

			map.set(command.fullId, success);
		}

		return map;
	}

	/**
	 * Scans for if the DiscordInteraction object would trigger a command,
	 * and runs those respective commands.
	 *
	 * @param msg DiscordInteraction object
	 * @param map Map of command IDs as keys, and whether they succeeded execution
	 * @param startTime
	 *
	 * @returns Modified map of what was passed into
	 */
	async scanAndRunDiscordInteractions(
		msg: DiscordInteraction,
		map: Map<string, boolean>,
		startTime?: [number, number]
	): Promise<Map<string, boolean>> {
		const interactions = this.client.plugins.discordInteractionsArray;

		for await (const command of interactions) {
			if (!this.shouldAllowUser(msg)) {
				break;
			}

			if (
				msg.command != undefined &&
				command.id != msg.command.toLocaleLowerCase()
			) {
				continue;
			}

			const interaction = msg.discordInteraction.interaction;
			const matchesType = this.discordInteractionMatchesBaseType(
				interaction,
				command
			);

			if (!matchesType) {
				continue;
			}

			const permCheck = await this.checkForPermissions(msg, command, map);
			if (!permCheck) {
				continue;
			}

			let logs: string[] = [];
			const showUnusedButtonInteractionsInLogs =
				process.env.FRAMED_SHOW_UNUSED_BUTTON_INTERACTIONS_IN_LOGS?.toLowerCase() ==
				"true";

			if (Logger.isSillyEnabled()) {
				let options = "";
				if (interaction.isCommand()) {
					options = Utils.util.inspect(interaction.options);
				}

				const parsedId =
					interaction.isMessageComponent() &&
					interaction.customId.startsWith(
						BaseDiscordMenuFlow.lzStringFlag
					)
						? lzstring.decompressFromUTF16(
								interaction.customId.slice(
									BaseDiscordMenuFlow.lzStringFlag.length,
									interaction.customId.length
								)
						  )
						: null;
				const id = interaction.isCommand()
					? ` with ID "${interaction.commandName}" `
					: "";
				const displayTime = startTime
					? `${Utils.hrTimeElapsed(startTime)}s - `
					: "";
				const runText = showUnusedButtonInteractionsInLogs
					? "Running"
					: "Finished";
				logs.push(oneLine`${displayTime}${runText} ${command.fullId}
						${id}from user ${interaction.user.tag}
						(${interaction.user.id})`);
				if (interaction.isMessageComponent()) {
					logs.push(
						oneLine`${displayTime}URL: https://discord.com/channels/${
							interaction.guildId ?? "@me"
						}/${interaction.channelId}/${interaction.message.id}`
					);
					logs.push(
						`${displayTime}${interaction.componentType} - ${
							parsedId ?? interaction.customId
						}`
					);
				} else {
					logs.push(
						`${displayTime}${interaction.type} (${interaction.id})`
					);
				}
				if (options) logs.push(options);
			}

			if (showUnusedButtonInteractionsInLogs) {
				for (const log of logs) {
					Logger.silly(log);
				}
			}

			let success = false;
			let threwError = false;
			try {
				success = await command.run(msg, interaction);
			} catch (error) {
				threwError = true;
				await this.handleFriendlyError(msg, error, {
					sendSeparateReply: true,
				});
			}
			map.set(command.fullId, success);

			if (
				!showUnusedButtonInteractionsInLogs &&
				(success || threwError)
			) {
				for (const log of logs) {
					Logger.silly(log);
				}
			}
		}

		return map;
	}

	/**
	 * Scans and runs menu flow pages.
	 *
	 * @param msg DiscordInteraction object
	 * @param map Map of command IDs as keys, and whether they succeeded execution
	 * @param options Function options
	 * @param startTime
	 *
	 * @returns Modified map of what was passed into
	 */
	async scanAndRunMenuFlowPages(
		msg: DiscordInteraction,
		map?: Map<string, boolean>,
		options?: {
			errorHandling?: "throw" | "sendAllErrors";
		},
		startTime: [number, number] = process.hrtime()
	): Promise<Map<string, boolean>> {
		if (!map) {
			map = new Map<string, boolean>();
		}
		let foundPage: BaseDiscordMenuFlowPage | undefined;
		let flowPageResults: boolean | undefined;
		for (const plugin of this.client.plugins.pluginsArray) {
			for (const [, menu] of plugin.discordMenuFlows) {
				const interaction = msg.discordInteraction.interaction;
				if (
					!interaction.isMessageComponent() &&
					!interaction.isModalSubmit()
				) {
					continue;
				}

				const data = menu.parseId(interaction.customId, true);
				if (!data) {
					continue;
				}

				// Compares IDs and gets ephemeral state
				const ephemeral =
					data.args[0] == `${menu.rawId}${menu.idInteractionFlag}`;
				if (
					!ephemeral &&
					data.args[0] != `${menu.rawId}${menu.idMessageFlag}`
				) {
					continue;
				}

				// Find a matching page
				for (const [, page] of menu.pages) {
					if (
						data.args[1] == page.id ||
						data.args[1]?.split(".")[0] == page.id
					) {
						if (!this.shouldAllowUser(msg)) {
							continue;
						}

						foundPage = page;

						const baseId = foundPage.menu.rawId;
						let doNotClose = false;

						// Do permission checks
						// NOTE: permCheckRenderOptions only really needs userId
						const permCheckRenderOptions: BaseDiscordMenuFlowPageRenderOptions =
							{
								guildId: data.guildId ?? msg.discord.guild?.id,
								messageId: data.messageId,
								userId: data.userId ?? msg.discord.author.id,
								ephemeral: ephemeral,
							};

						const permCheckPage = await this.checkForPermissions(
							msg,
							foundPage,
							map,
							permCheckRenderOptions
						);
						if (!permCheckPage) continue;
						if (
							!foundPage.userPermissions &&
							page.menu.userPermissions
						) {
							const permMenuCheck =
								await this.checkForPermissions(
									msg,
									page.menu,
									map,
									permCheckRenderOptions
								);
							if (!permMenuCheck) continue;
						}

						try {
							const displayTime = startTime
								? `${Utils.hrTimeElapsed(startTime)}s - `
								: "";
							Logger.silly(oneLine`${displayTime}Running menu flow
							"${baseId}" from user ${msg.discord.author.tag} (${msg.discord.author.id})`);
							const parsedId = interaction.customId.startsWith(
								BaseDiscordMenuFlow.lzStringFlag
							)
								? lzstring.decompressFromUTF16(
										interaction.customId.slice(
											BaseDiscordMenuFlow.lzStringFlag
												.length,
											interaction.customId.length
										)
								  )
								: interaction.customId;
							Logger.silly(`${displayTime}${parsedId}`);

							flowPageResults = await page.render(
								msg,
								await page.parse(msg, {
									...data,
									ephemeral: ephemeral,
								})
							);
						} catch (error) {
							const err = error as Error;
							if (
								err instanceof FriendlyError ||
								err.message == "Unknown interaction"
							) {
								doNotClose = true;
							}

							if (
								!options?.errorHandling ||
								options?.errorHandling == "sendAllErrors"
							) {
								await this.handleFriendlyError(msg, err, {
									sendSeparateReply: false,
									ephemeral: page.menu.parseId(
										interaction.customId
									).ephemeral,
								});
							} else {
								throw err;
							}
						}
						const displayTime = startTime
							? `${Utils.hrTimeElapsed(startTime)}s - `
							: "";
						Logger.silly(
							oneLine`${displayTime}Finished processing menu flow "${baseId}"
							from user ${msg.discord.author.tag} (${msg.discord.author.id})`
						);

						/**
						 * For mapResults; returns the results from render.
						 *
						 * If the bot takes too long, and there's no result,
						 * return true so the user can try again.
						 *
						 * Else if it was just a FriendlyError, or a delayed interaction,
						 * and it was for-sure a fail, return false.
						 */
						const mapResults = flowPageResults
							? flowPageResults
							: doNotClose
							? false
							: true;
						if (!mapResults) {
							Logger.silly(
								oneLine`${displayTime}Finished closing menu flow "${baseId}"
								from user ${msg.discord.author.tag} (${msg.discord.author.id})`
							);
						}
						map.set(baseId, mapResults);
					}
				}
				if (!foundPage) {
					Logger.error(
						`Page with ID "${data.args[1]}" doesn't exist on menu with ID "${data.args[0]}"`
					);
				} else {
					break;
				}
			}
		}

		return map;
	}

	protected discordInteractionMatchesBaseType(
		interaction: Discord.Interaction,
		command: BaseCommand
	): boolean {
		return (
			(interaction.isAutocomplete() &&
				command instanceof BaseDiscordAutocompleteInteraction) ||
			(interaction.isButton() &&
				command instanceof BaseDiscordButtonInteraction) ||
			(interaction.isCommand() &&
				command instanceof BaseDiscordInteraction) ||
			(interaction.isContextMenuCommand() &&
				command instanceof BaseDiscordContextMenuCommandInteraction) ||
			(interaction.isMessageComponent() &&
				command instanceof BaseDiscordMessageComponentInteraction) ||
			(interaction.isSelectMenu() &&
				command instanceof BaseDiscordSelectMenuInteraction)
		);
	}

	/**
	 * Checks for permission, and sends an error message.
	 *
	 * @param msg BaseMessage object
	 * @param base BasePluginObject
	 * @param map Optional results map
	 * @returns `true` if passed
	 */
	async checkForPermissions(
		msg: BaseMessage,
		base: BasePluginObject,
		map?: Map<string, boolean>,
		pageRenderOptions?: BaseDiscordMenuFlowPageRenderOptions
	): Promise<boolean> {
		const results = await base.handlePermissionChecks(
			msg,
			{
				checkUserPermissions:
					base.userPermissions?.checkAutomatically != false,
				checkBotPermissions:
					base.botPermissions?.checkAutomatically != false,
			},
			pageRenderOptions
		);
		map?.set(base.fullId, results);
		return results;
	}

	async processCooldownCheck(
		msg: BaseMessage,
		command: BaseCommand,
		map?: Map<string, boolean>
	): Promise<boolean> {
		// Checks automatically for user permissions
		if (command.cooldown?.checkAutomatically != false) {
			const userId = msg.userId;

			// Fallback, if for some reason there is no userId
			if (userId == undefined) return true;

			const cooldownData = await command.getCooldown(userId);
			if (cooldownData) {
				const currentDate = new Date();
				if (typeof cooldownData.endDate == "string") {
					cooldownData.endDate = new Date(cooldownData.endDate);
				}
				const cooldownActive =
					cooldownData.endDate.getTime() > currentDate.getTime();

				if (cooldownActive) {
					let sent = false;
					let sentError: Error | undefined;
					try {
						sent = await command.sendCooldownErrorMessage(
							msg,
							cooldownData.endDate,
							currentDate
						);
					} catch (error) {
						sentError = error as Error;
					}

					if (sentError) {
						Logger.error(sentError);
					} else if (!sent) {
						Logger.error(`"${command.id}" tried to send
						a cooldown error message, but something went wrong!`);
					}
				}

				map?.set(command.fullId, !cooldownActive);
				return !cooldownActive;
			}
		}

		return true;
	}

	async setCooldown(userId: string, command: BaseCommand): Promise<void> {
		if (!command.cooldown) return;

		const client = command.client;
		const date = new Date();
		date.setSeconds(date.getSeconds() + command.cooldown?.time);

		return client.provider.cooldowns.set({
			userId: userId,
			commandId: command.fullId,
			cooldownDate: date,
		});
	}

	/**
	 * Sends a message showing help for a command.
	 *
	 * @param msg BaseMessage object
	 * @returns boolean value `true` if help is shown.
	 */
	async sendHelpForCommand(msg: BaseMessage): Promise<boolean> {
		try {
			const helpCommand = msg.client.commands.getCommand("help");

			if (!helpCommand) {
				Logger.warn("No help command found");
				return false;
			}

			const place = await msg.getPlace();
			const helpPrefix = helpCommand.getDefaultPrefix(place);

			const content = oneLineInlineLists`${
				helpPrefix ??
				msg.client.commands.defaultPrefixes[0] ??
				msg.client.defaultPrefix
			}help ${msg.command} ${msg.args ?? ""}`.trim();

			let newMsg: DiscordMessage | TwitchMessage;
			let guild: Discord.Guild | undefined;
			if (msg instanceof DiscordMessage) {
				newMsg = new DiscordMessage({
					client: msg.client,
					content: content,
					discord: {
						client: msg.discord.client,
						channel: msg.discord.channel,
						author: msg.discord.author,
						guild: msg.discord.guild,
					},
				});

				guild = msg.discord.guild ?? undefined;
			} else if (msg instanceof TwitchMessage) {
				newMsg = new TwitchMessage({
					client: msg.client,
					content: content,
					twitch: {
						chat: msg.twitch.chat,
						channel: msg.twitch.channel,
						user: msg.twitch.user,
					},
				});
			} else {
				throw new Error("Unknown message class");
			}

			await newMsg.getMessageElements(place);
			const success = await helpCommand.run(newMsg);
			if (success) {
				return true;
			} else {
				throw new Error("Help command execution didn't succeed");
			}
		} catch (error) {
			Logger.error((error as Error).stack);
			return false;
		}
	}

	/**
	 * Sends an error message for friendly errors.
	 *
	 * @param msg BaseMessage object
	 * @param friendlyError Friendly error to show
	 * @param options Friendly error display options
	 */
	async sendErrorMessage(
		msg: BaseMessage,
		friendlyError: FriendlyError,
		options?: HandleFriendlyErrorOptions
	): Promise<void> {
		if (friendlyError instanceof InternalError) {
			Logger.error(friendlyError.stack);
		} else {
			Logger.verbose(friendlyError.stack);
		}

		if (
			options?.ephemeral == undefined &&
			msg instanceof DiscordInteraction
		) {
			const interaction = msg.discordInteraction.interaction;
			if (interaction.isCommand() || interaction.isContextMenuCommand()) {
				options = {};
				options.ephemeral = true;
			}
		}

		const messageOptions =
			msg instanceof DiscordMessage || msg instanceof DiscordInteraction
				? await this._getMessageOptionsForErrorMsg(
						msg,
						friendlyError,
						options
				  )
				: undefined;

		async function sendMessageOptions() {
			if (messageOptions) {
				let useDm = false;
				if (
					msg instanceof DiscordMessage ||
					msg instanceof DiscordInteraction
				) {
					const missingPerms =
						await BasePluginObject.getMissingDiscordMemberPermissions(
							msg,
							msg.discord.member,
							[
								PermissionFlagsBits.SendMessages,
								PermissionFlagsBits.EmbedLinks,
							]
						);

					useDm =
						msg instanceof DiscordMessage &&
						missingPerms.includes("SendMessages");
				}

				if (useDm && msg.discord) {
					await msg.discord.author.send(
						messageOptions as
							| string
							| Discord.MessagePayload
							| Discord.BaseMessageOptions
					);
				} else if (msg instanceof DiscordInteraction) {
					const interaction = msg.discordInteraction.interaction;
					if (
						interaction.isCommand() &&
						interaction.replied &&
						options?.sendSeparateReply != false
					) {
						await interaction.followUp(
							messageOptions as
								| string
								| Discord.InteractionReplyOptions
						);
					} else if (
						interaction.isMessageComponent() &&
						options?.sendSeparateReply != false
					) {
						await interaction.reply(
							messageOptions as
								| string
								| Discord.InteractionReplyOptions
						);
					} else {
						await msg.send(
							messageOptions as
								| string
								| Discord.MessagePayload
								| Discord.InteractionReplyOptions
						);
					}
				} else {
					await msg.send(messageOptions);
				}
			} else {
				await msg.send(
					`${friendlyError.friendlyName}: ${friendlyError.message}`
				);
			}
		}

		try {
			await sendMessageOptions();
		} catch (error) {
			if (
				typeof messageOptions != "string" &&
				messageOptions &&
				"content" in messageOptions &&
				!messageOptions.content
			) {
				Logger.warn(error);
				Logger.warn("Retrying send, with filled content");
				messageOptions.content = "_ _";
				await sendMessageOptions();
			} else {
				throw error;
			}
		}
	}

	protected async _getMessageOptionsForErrorMsg(
		msg: DiscordMessage | DiscordInteraction,
		friendlyError: FriendlyError,
		options?: HandleFriendlyErrorOptions
	): Promise<
		| string
		| Discord.MessagePayload
		| Discord.BaseMessageOptions
		| Discord.InteractionReplyOptions
		| undefined
	> {
		let embed: Discord.EmbedBuilder | undefined;
		let messageOptions:
			| string
			| Discord.MessagePayload
			| Discord.BaseMessageOptions
			| Discord.InteractionReplyOptions
			| undefined;

		if (msg.discord) {
			embed = (
				await EmbedHelper.getTemplate(
					msg.discord,
					await EmbedHelper.getCheckOutFooter(msg)
				)
			)
				.setTitle(friendlyError.friendlyName)
				.setDescription(friendlyError.message);
			messageOptions = { embeds: [embed] };
		}

		// If it's an interaction, make it ephemeral
		if (msg instanceof DiscordInteraction && embed) {
			const useEmbedForFriendlyErrors =
				process.env.FRAMED_USE_EMBED_FOR_FRIENDLY_ERRORS;
			if (useEmbedForFriendlyErrors?.toLocaleLowerCase() == "true") {
				messageOptions = {
					embeds: [embed],
					ephemeral: true,
					components: [],
				};
			} else {
				const friendlyName =
					friendlyError.friendlyName == "Something Went Wrong"
						? ""
						: `**${friendlyError.friendlyName}**`;
				messageOptions = {
					content: `${friendlyName}\n${friendlyError.message}`.trim(),
					components: [],
					embeds: [],
					ephemeral: true,
				};
			}
		}

		return messageOptions;
	}
}
