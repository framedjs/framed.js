/* eslint-disable no-mixed-spaces-and-tabs */
import { Base } from "../structures/Base";
import { BaseCommand } from "../structures/BaseCommand";
import { BaseDiscordInteraction } from "../structures/BaseDiscordInteraction";
import { BaseDiscordAutocompleteInteraction } from "../structures/BaseDiscordAutocompleteInteraction";
import { BaseDiscordButtonInteraction } from "../structures/BaseDiscordButtonInteraction";
import { BaseDiscordContextMenuInteraction } from "../structures/BaseDiscordContextMenuInteraction";
import { BaseDiscordMenuFlow } from "../structures/BaseDiscordMenuFlow";
import { BaseDiscordMenuFlowPage } from "../structures/BaseDiscordMenuFlowPage";
import { BaseDiscordMessageComponentInteraction } from "../structures/BaseDiscordMessageComponentInteraction";
import { BaseDiscordSelectMenuInteraction } from "../structures/BaseDiscordSelectMenuInteraction";
import { BaseMessage } from "../structures/BaseMessage";
import { BasePluginObject } from "../structures/BasePluginObject";
import Discord from "discord.js";
import { DiscordCommandInteraction } from "../structures/DiscordCommandInteraction";
import { DiscordInteraction } from "../structures/DiscordInteraction";
import { DiscordMessage } from "../structures/DiscordMessage";
import { Client } from "../structures/Client";
import { EmbedHelper } from "../utils/discord/EmbedHelper";
import { FriendlyError } from "../structures/errors/FriendlyError";
import { Logger } from "@framedjs/logger";
import { TwitchMessage } from "../structures/TwitchMessage";
import { Utils } from "@framedjs/shared";
import { oneLine, oneLineInlineLists } from "common-tags";

import type { BaseDiscordMenuFlowPageRenderOptions } from "../interfaces/BaseDiscordMenuFlowPageRenderOptions";
import type { FoundCommandData } from "../interfaces/FoundCommandData";
import type { HandleFriendlyErrorOptions } from "../interfaces/HandleFriendlyErrorOptions";
import type {
	UserPermissionAllowedData,
	UserPermissionDeniedData,
} from "../interfaces/UserPermissionData";
import type { Place } from "../interfaces/Place";

export class CommandManager extends Base {
	constructor(client: Client) {
		super(client);
	}

	/**
	 * List of all the default prefixes
	 *
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
	 * BaseCommand array
	 *
	 * @returns List of all the base commands from all plugins
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
	getPossiblePrefixes(place: Place, guild?: Discord.Guild | null): string[] {
		// const startTime = process.hrtime();
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
			const rolePrefix = guild.me?.roles.botRole?.toString();
			if (rolePrefix) {
				prefixes.push(rolePrefix);
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

	/**
	 * Retrieves the bot's automatic role for a prefix
	 *
	 * @param guild Discord Guild
	 *
	 * @deprecated Use guild.me.roles.botRole.toString() instead.
	 */
	getBotRolePrefix(guild: Discord.Guild): string | undefined {
		const roles = guild.roles;
		const botRole = roles.cache.find(
			a => a.name === guild.me?.user.username
		);

		if (botRole) {
			return botRole.toString();
		}
	}

	//#region Getting commands

	/**
	 *
	 * @param msg Framed message
	 */
	async getFoundCommandData(
		msg: BaseMessage,
		place: Place
	): Promise<FoundCommandData[]>;

	/**
	 *
	 * @param prefix
	 * @param command
	 * @param args
	 */
	async getFoundCommandData(
		command: string,
		args: string[],
		place: Place,
		prefix?: string
	): Promise<FoundCommandData[]>;

	/**
	 *
	 * @param msgOrCommand
	 * @param args
	 * @param prefix
	 */
	async getFoundCommandData(
		msgOrCommand: BaseMessage | string,
		argsOrPlace?: string[] | Place,
		place?: Place,
		prefix?: string
	): Promise<FoundCommandData[]> {
		let command: string;
		let args: string[];

		if (msgOrCommand instanceof BaseMessage) {
			if (msgOrCommand.command != undefined) {
				prefix = msgOrCommand.prefix;
				command = msgOrCommand.command;
				args = msgOrCommand.args ? msgOrCommand.args : [];
				place = place ? place : await msgOrCommand.getPlace();
			} else {
				throw new Error(`Command parameter in Message was undefined`);
			}
		} else {
			if (!(argsOrPlace instanceof Array)) {
				throw new Error(
					`argsOrPlace must be an Array, if msgOrComamnd is a string`
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
			const element: FoundCommandData = {
				command: command,
				subcommands: [],
			};

			element.subcommands = command.getSubcommandChain(args);
			data.push(element);
		}

		return data;
	}

	/**
	 * Gets a command
	 *
	 * @param command Command ID
	 * @param place Place data
	 * @param prefix Prefix
	 *
	 * @returns BaseCommand or undefined
	 */
	getCommand(
		command: string,
		place?: Place,
		prefix?: string
	): BaseCommand | undefined;

	/**
	 * Gets a command
	 *
	 * @param msg Framed Message
	 * @param place Place data
	 *
	 * @returns BaseCommand or undefined
	 */
	getCommand(msg: BaseMessage, place?: Place): BaseCommand | undefined;

	/**
	 * Gets a command
	 *
	 * @param msgOrCommand Framed Message or command string
	 * @param place Place data
	 * @param prefix Prefix
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
	 * @param prefix Prefix
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
	 * @param msg Framed message
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
	 * @param msgOrCommand Framed Message or command
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

		let commandString: string;

		if (msgOrCommand instanceof BaseMessage) {
			if (msgOrCommand.command != undefined) {
				prefix = msgOrCommand.prefix;
				commandString = msgOrCommand.command;
			} else {
				throw new Error(`Command parameter in Message was undefined`);
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

					if (
						msgOrCommand instanceof DiscordMessage &&
						msgOrCommand.discord.guild
					) {
						const rolePrefix =
							msgOrCommand.discord.guild.me?.roles.botRole?.toString();
						if (rolePrefix) commandPrefixes.push(rolePrefix);
					}

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
	 * @param msg Message object
	 */
	async run(msg: BaseMessage): Promise<Map<string, boolean>> {
		const startTime = process.hrtime();
		const map = new Map<string, boolean>();

		if (msg instanceof DiscordInteraction) {
			try {
				await this.scanAndRunMenuFlowPages(msg, map, {
					errorHandling: "sendAllErrors",
				});
			} catch (error) {
				await this.handleFriendlyError(msg, error, {
					sendSeparateReply: false,
				});
			}
		}

		try {
			if (msg.prefix != undefined && msg.command != undefined) {
				// Logger.silly(`Checking for commands for "${msg.content}"`);

				try {
					if (
						!(msg instanceof DiscordInteraction) ||
						msg instanceof DiscordCommandInteraction
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

	private _checkForBot(msg: BaseMessage) {
		/*
		 * If the author is a bot, we ignore their command.
		 *
		 * This is to patch any security exploits, such as using the Raw.ts command
		 * to print out a plain message that contains a comamnd. Then, the command will
		 * run with elevated permissions, as the bot likely has higher permissions than the user.
		 */
		if (
			msg.discord?.author.bot &&
			process.env.FRAMED_ALLOW_BOTS_TO_RUN_COMMANDS?.toLowerCase() !=
				"true"
		) {
			Logger.warn(
				`${msg.discord.author.tag} attempted to run a command, but was a bot!`
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
	 * @param msg
	 * @param error
	 * @param options
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
			Logger.error((error as Error).stack);
		}
	}

	async scanAndRunCommands(
		msg: BaseMessage,
		map: Map<string, boolean>,
		startTime?: [number, number]
	): Promise<Map<string, boolean>> {
		// Attempts to get the command data from a message, including comparing prefixes
		const data = await this.getFoundCommandData(msg, await msg.getPlace());

		for await (const element of data) {
			if (!this._checkForBot(msg)) {
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
			} else if (
				msg instanceof DiscordInteraction &&
				msg.discordInteraction.interaction.isCommand()
			) {
				const interaction = msg.discordInteraction.interaction;
				const options = Utils.util.inspect(interaction.options);

				Logger.verbose(
					oneLine`${displayTime}Running
					/${interaction.commandName}
					from user ${interaction.user.tag}
					(${msg.discordInteraction.user.id})`
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

	async scanAndRunDiscordInteractions(
		msg: DiscordInteraction,
		map: Map<string, boolean>,
		startTime?: [number, number]
	): Promise<Map<string, boolean>> {
		const interactions = this.client.plugins.discordInteractionsArray;

		for await (const command of interactions) {
			if (!this._checkForBot(msg)) {
				break;
			}

			if (msg.command && command.id != msg.command.toLocaleLowerCase()) {
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

			if (Logger.isSillyEnabled()) {
				let options = "";
				if (
					interaction.isApplicationCommand() ||
					interaction.isContextMenu() ||
					interaction.isCommand()
				) {
					options = Utils.util.inspect(interaction.options);
				}

				if (options) {
					const displayTime = startTime
						? `${Utils.hrTimeElapsed(startTime)}s - `
						: "";
					Logger.silly(oneLine`${displayTime}Running interaction
						${interaction.id} from user ${interaction.user.tag}
						(${interaction.user.id})`);
					Logger.silly(options);
				}
			}

			const success = await command.run(msg, interaction);
			map.set(command.fullId, success);
		}

		return map;
	}

	async scanAndRunMenuFlowPages(
		msg: DiscordInteraction,
		map?: Map<string, boolean>,
		options?: {
			errorHandling?: "throw" | "sendAllErrors";
		}
	): Promise<Map<string, boolean>> {
		if (!map) {
			map = new Map<string, boolean>();
		}
		let foundPage: BaseDiscordMenuFlowPage | undefined;
		let flowPageResults: boolean | undefined;
		for (const plugin of this.client.plugins.pluginsArray) {
			for (const [, menu] of plugin.discordMenuFlows) {
				const interaction = msg.discordInteraction.interaction;
				if (!interaction.isButton() && !interaction.isSelectMenu()) {
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
						if (!this._checkForBot(msg)) {
							continue;
						}

						foundPage = page;

						const timestamp =
							msg.discordInteraction.interaction.createdTimestamp;
						const baseId = foundPage.menu.getBaseId();
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
							Logger.silly(
								`${timestamp} baseId "${baseId}" has started`
							);

							flowPageResults = await page.render(
								msg,
								await page.parse(msg, {
									guildId: data.guildId,
									messageId: data.messageId,
									channelId: data.channelId,
									userId: data.userId,
									ephemeral: ephemeral,
									pageNumber: data.pageNumber,
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
								});
							} else {
								throw err;
							}
						}
						Logger.silly(
							`${timestamp} baseId "${baseId}" has processed`
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
								`${timestamp} baseId "${baseId}" has closed`
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
			(interaction.isContextMenu() &&
				command instanceof BaseDiscordContextMenuInteraction) ||
			(interaction.isMessageComponent() &&
				command instanceof BaseDiscordMessageComponentInteraction) ||
			(interaction.isSelectMenu() &&
				command instanceof BaseDiscordSelectMenuInteraction)
		);
	}

	/**
	 * Checks for permission, and sends an error message
	 *
	 * @param msg
	 * @param base
	 * @param map Optional results map
	 *
	 * @returns true if passed
	 */
	async checkForPermissions(
		msg: BaseMessage,
		base: BasePluginObject,
		map?: Map<string, boolean>,
		pageRenderOptions?: BaseDiscordMenuFlowPageRenderOptions
	): Promise<boolean> {
		// Checks automatically for user permissions
		if (base.userPermissions?.checkAutomatically != false) {
			let data: UserPermissionAllowedData | UserPermissionDeniedData;
			if (
				base instanceof BaseDiscordMenuFlow ||
				base instanceof BaseDiscordMenuFlowPage
			) {
				data = base.checkUserPermissions(
					msg,
					base.userPermissions,
					pageRenderOptions
				);
			} else {
				data = base.checkUserPermissions(msg);
			}
			if (!data.success) {
				const sent = await base.sendUserPermissionErrorMessage(
					msg,
					base.userPermissions,
					data
				);
				if (!sent) {
					Logger.error(oneLine`"${base.id}" tried to send
					a user permission error message, but something went wrong!`);
				}
				map?.set(base.fullId, false);
				return false;
			}
		}

		// Checks automatically for bot permissions
		if (base.botPermissions?.checkAutomatically != false) {
			const data = await base.checkBotPermissions(msg);
			if (!data.success) {
				let sent = false;
				let sentError: Error | undefined;
				try {
					sent = await base.sendBotPermissionErrorMessage(
						msg,
						base.botPermissions,
						data
					);
				} catch (error) {
					sentError = error as Error;
				}

				if (sentError) {
					Logger.error(sentError);
				} else if (!sent) {
					Logger.error(oneLine`"${base.id}" tried to send
					a user permission error message, but something went wrong!`);
				}

				map?.set(base.fullId, false);
				return false;
			}
		}

		return true;
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
	 * @param msg Framed Message containing command that needs to be shown help for
	 *
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

			await newMsg.getMessageElements(place, guild);
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
	 * Sends error message
	 *
	 * @param msg
	 * @param friendlyError
	 * @param sendSeparateReply
	 */
	async sendErrorMessage(
		msg: BaseMessage,
		friendlyError: FriendlyError,
		options?: HandleFriendlyErrorOptions
	): Promise<void> {
		Logger.warn(oneLine`The below warning is likely
		safe to ignore, unless needed for debug purposes.`);
		Logger.warn(friendlyError.stack);

		let embed: Discord.MessageEmbed | undefined;
		let messageOptions:
			| string
			| Discord.MessagePayload
			| Discord.MessageOptions
			| Discord.InteractionReplyOptions
			| undefined;

		if (msg.discord) {
			embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg)
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
					content: "_ _",
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
						["SEND_MESSAGES", "EMBED_LINKS"]
					);

				useDm =
					msg instanceof DiscordMessage &&
					missingPerms.includes("SEND_MESSAGES");
			}

			if (useDm && msg.discord) {
				await msg.discord.author.send(
					messageOptions as
						| string
						| Discord.MessagePayload
						| Discord.MessageOptions
				);
			} else if (msg instanceof DiscordInteraction) {
				const interaction = msg.discordInteraction.interaction;
				if (
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
}
