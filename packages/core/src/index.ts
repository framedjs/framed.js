// Managers
export { APIManager } from "./managers/APIManager";
// export { ArgumentManger } from "./managers/ArgumentManager";
export { CommandManager } from "./managers/CommandManager";
export { PluginManager } from "./managers/PluginManager";

// Structures
export { Client } from "./structures/Client";
export { BaseMessage } from "./structures/BaseMessage";
export { Base } from "./structures/Base";
export { BasePlugin } from "./structures/BasePlugin";
export { BaseCommand } from "./structures/BaseCommand";
export { BaseSubcommand } from "./structures/BaseSubcommand";
export { BaseEvent } from "./structures/BaseEvent";
export { BaseRouter } from "./structures/BaseRouter";
export { DiscordMessage } from "./structures/DiscordMessage";
export { TwitchMessage } from "./structures/TwitchMessage";

// Interfaces
export { Argument } from "./interfaces/Argument";
// export { ArgumentOptions } from "./interfaces/ArgumentOptions"
export { BaseCommandOptions } from "./interfaces/BaseCommandOptions";
export { ClientOptions } from "./interfaces/ClientOptions";
// export { DiscordMessageData } from "./interfaces/DiscordMessageData";
// export { DiscordMessageDataOptions } from "./interfaces/DiscordMessageDataOptions";
export { DiscohookOutputData } from "./interfaces/other/DiscohookOutputData";
export { FoundCommandData } from "./interfaces/FoundCommandData";
export { HelpData } from "./interfaces/other/HelpData";
export { LoginOptions } from "./interfaces/LoginOptions";
export { MessageOptions } from "./interfaces/MessageOptions";
export { Place } from "./interfaces/Place";
export { InlineOptions } from "./interfaces/InlineOptions";
// export { ResponseData } from "./managers/database/interfaces/ResponseData";
export { default as RequireAllOptions } from "./interfaces/other/RequireAllOptions";
export { Settings } from "./providers/interfaces/Settings";

// Providers
export { BaseProvider } from "./providers/BaseProvider";
export { Provider } from "./providers/subproviders/Provider";
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
export { FriendlyError } from "./structures/errors/FriendlyError";
export { InvalidError } from "./structures/errors/InvalidError";
export { NotFoundError } from "./structures/errors/NotFoundError";
export { PermissionDeniedError } from "./structures/errors/PermissionDeniedError";
export { DiscordBotMissingPermissionsError } from "./structures/errors/DiscordBotMissingPermissionsError";

// Version
// eslint-disable-next-line @typescript-eslint/no-var-requires
const version = require("../package.json").version as string;
export { version };

// Logger
export { Logger, defaultLevels, defaultFormat } from "@framedjs/logger";

// Discord export to avoid MessageEmbed empty message bugs, since
// checking instanceof classes doesn't work without the internal Discord module
import * as Discord from "discord.js";
export { Discord };

// Twitch exports because things will probably go wrong without it, like with Discord.js
import * as Twitch from "twitch";
import * as TwitchAuth from "twitch-auth";
import * as TwitchChatClient from "twitch-chat-client";
export { Twitch };
export { TwitchAuth };
export { TwitchChatClient };
