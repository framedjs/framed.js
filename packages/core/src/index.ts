// Managers
// export { ArgumentManger } from "./managers/ArgumentManager";
export { CommandManager } from "./managers/CommandManager";
export { FormattingManager } from "./managers/FormattingManager";
export { PluginManager } from "./managers/PluginManager";

// Structures
export { Client } from "./structures/Client";
export { BaseMessage } from "./structures/BaseMessage";
export { Base } from "./structures/Base";
export { BasePlugin } from "./structures/BasePlugin";
export { BasePluginObject } from "./structures/BasePluginObject";
export { BaseCommand } from "./structures/BaseCommand";
export { BaseDiscordButtonInteraction } from "./structures/BaseDiscordButtonInteraction";
export { BaseDiscordContextMenuInteraction } from "./structures/BaseDiscordContextMenuInteraction";
export { BaseDiscordInteraction } from "./structures/BaseDiscordInteraction";
export { BaseDiscordMenuFlow } from "./structures/BaseDiscordMenuFlow";
export { BaseDiscordMenuFlowPage } from "./structures/BaseDiscordMenuFlowPage";
export { BaseDiscordMenuFlowMsgPage } from "./structures/BaseDiscordMenuFlowMsgPage";
export { BaseDiscordMenuFlowNumPage } from "./structures/BaseDiscordMenuFlowNumPage";
export { BaseDiscordMenuFlowStartPage } from "./structures/BaseDiscordMenuFlowStartPage";
export { BaseDiscordMessageComponentInteraction } from "./structures/BaseDiscordMessageComponentInteraction";
export { BaseDiscordSelectMenuInteraction } from "./structures/BaseDiscordSelectMenuInteraction";
export { BaseSubcommand } from "./structures/BaseSubcommand";
export { BaseEvent } from "./structures/BaseEvent";
export { DiscordMessage } from "./structures/DiscordMessage";
export { DiscordInteraction } from "./structures/DiscordInteraction";
export { DiscordCommandInteraction } from "./structures/DiscordCommandInteraction";
export { TwitchMessage } from "./structures/TwitchMessage";

// Interfaces
export type { Argument } from "./interfaces/Argument";
export type { ArgumentNotWrappedInQuotes } from "./interfaces/Argument";
export type { ArgumentOptions } from "./interfaces/ArgumentOptions";
export type { ArgumentWrappedInQuotes } from "./interfaces/Argument";
export type { BaseCommandOptions } from "./interfaces/BaseCommandOptions";
export type { BaseDiscordInteractionOptions } from "./interfaces/BaseDiscordInteractionOptions";
export type { BaseDiscordMenuFlowOptions } from "./interfaces/BaseDiscordMenuFlowOptions";
export type { BaseDiscordMenuFlowMsgPageOptions } from "./interfaces/BaseDiscordMenuFlowMsgPageOptions";
export type { BaseDiscordMenuFlowNumPageOptions } from "./interfaces/BaseDiscordMenuFlowNumPageOptions";
export type { BaseDiscordMenuFlowPageOptions } from "./interfaces/BaseDiscordMenuFlowPageOptions";
export type { BaseDiscordMenuFlowPageRenderOptions } from "./interfaces/BaseDiscordMenuFlowPageRenderOptions";
export type { BaseDiscordMenuFlowSelectMenuHandleOptions } from "./interfaces/BaseDiscordMenuFlowSelectMenuHandleOptions";
export type { BaseDiscordMenuFlowSelectMenuReturnOptions } from "./interfaces/BaseDiscordMenuFlowSelectMenuReturnOptions";
export type { BotPermissions } from "./interfaces/BotPermissions";
export type { ClientOptions } from "./interfaces/ClientOptions";
export type { CooldownOptions } from "./interfaces/CooldownOptions";
export type { CooldownData } from "./interfaces/CooldownData";
// export { DiscordMessageData } from "./interfaces/DiscordMessageData";
// export { DiscordMessageDataOptions } from "./interfaces/DiscordMessageDataOptions";
export type { DiscordMenuFlowIdData } from "./interfaces/DiscordMenuFlowIdData";
export type { DiscordInteractionSendOptions } from "./interfaces/DiscordInteractionSendOptions";
export type { DiscohookOutputData } from "./interfaces/other/DiscohookOutputData";
export type { FoundCommandData } from "./interfaces/FoundCommandData";
export type { HandleFriendlyErrorOptions } from "./interfaces/HandleFriendlyErrorOptions";
export type { HelpData } from "./interfaces/other/HelpData";
export type {
	DiscordLoginOptions,
	TwitchLoginOptions,
} from "./interfaces/LoginOptions";
export type { MessageOptions } from "./interfaces/MessageOptions";
export type { ParseEmojiAndStringData } from "./interfaces/ParseEmojiAndStringData";
export type { Place } from "./interfaces/Place";
export type { InlineOptions } from "./interfaces/InlineOptions";
// export { ResponseData } from "./managers/database/interfaces/ResponseData";
export type { RequireAllOptions } from "@framedjs/shared";
export type { UserPermissions } from "./interfaces/UserPermissions";
export type { UserPermissionsMenuFlow } from "./interfaces/UserPermissionsMenuFlow";
export type { Settings } from "./providers/interfaces/Settings";

// Providers
export { BaseProvider } from "./providers/BaseProvider";
export { Provider } from "./providers/subproviders/Provider";
export { CooldownProvider } from "./providers/subproviders/CooldownProvider";
export { PrefixProvider } from "./providers/subproviders/PrefixProvider";
export { PluginProvider } from "./providers/subproviders/PluginProvider";
export { SettingsProvider } from "./providers/subproviders/SettingsProvider";
export { PlaceProvider } from "./providers/subproviders/PlaceProvider";

// Utilities
export { Utils } from "@framedjs/shared";
export { DiscordUtils } from "./utils/discord/DiscordUtils";
export { EmbedHelper } from "./utils/discord/EmbedHelper";

// Types
export { Platform } from "./types/Platform";

// Friendly Errors
export { DiscordBotMissingPermissionsError } from "./structures/errors/DiscordBotMissingPermissionsError";
export { DiscordDMIncompatibleError } from "./structures/errors/DiscordDMIncompatibleError";
export { DiscordUnableToDMError } from "./structures/errors/DiscordUnableToDMError";
export { FriendlyError } from "./structures/errors/FriendlyError";
export { InternalError } from "./structures/errors/InternalError";
export { InvalidError } from "./structures/errors/InvalidError";
export { NotFoundError } from "./structures/errors/NotFoundError";
export { PermissionDeniedError } from "./structures/errors/PermissionDeniedError";

// Version
export { version } from "./utils/Version";

// Logger
export { Logger, defaultLevels, defaultFormat } from "@framedjs/logger";

// Discord export to avoid MessageEmbed empty message bugs, since
// checking instanceof classes doesn't work without the internal Discord module
import * as Discord from "discord.js";
export { Discord };

// Slash commands
export * as DiscordJsBuilders from "@discordjs/builders";
export { REST as DiscordJsREST } from "@discordjs/rest";
export * as DiscordJsApi from "discord-api-types/v10";

// Twitch exports because things will probably go wrong without it, like with Discord.js
import * as Twitch from "twitch";
import * as TwitchAuth from "twitch-auth";
import * as TwitchChatClient from "twitch-chat-client";
export { Twitch };
export { TwitchAuth };
export { TwitchChatClient };
