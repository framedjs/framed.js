// Managers
export { APIManager } from "./managers/APIManager";
// export { ArgumentManger } from "./managers/ArgumentManager";
export { PluginManager } from "./managers/PluginManager";
export { DatabaseManager } from "./managers/DatabaseManager";

// Structures
export { Client } from "./structures/Client";
export { Message } from "./structures/Message";

export { BasePlugin } from "./structures/BasePlugin";
export { BaseCommand } from "./structures/BaseCommand";
export { BaseSubcommand } from "./structures/BaseSubcommand";
export { BaseEvent } from "./structures/BaseEvent";
export { BaseRouter } from "./structures/BaseRouter";

// Interfaces
export { Argument } from "./interfaces/Argument";
// export { ArgumentOptions } from "./interfaces/ArgumentOptions"
export { BaseCommandOptions } from "./interfaces/BaseCommandOptions";
// export { ClientOptions } from "./interfaces/ClientOptions";
// export { DiscordMessage } from "./interfaces/DiscordMessage";
// export { DiscordMessageOptions } from "./interfaces/DiscordMessageOptions";
export { DiscohookOutputData } from "./interfaces/other/DiscohookOutputData";
export { FoundCommandData } from "./interfaces/FoundCommandData";
export { HelpData } from "./interfaces/other/HelpData";
export { LoginOptions } from "./interfaces/LoginOptions";
export { MessageOptions } from "./interfaces/MessageOptions";
export { Place } from "./interfaces/Place";
export { InlineOptions } from "./interfaces/InlineOptions";
export { ResponseData } from "./managers/database/interfaces/ResponseData";

// TypeORM
export { default as Command } from "./managers/database/entities/Command";
export { default as Prefix } from "./managers/database/entities/Prefix";
export { default as Response } from "./managers/database/entities/Response";
export { default as Plugin } from "./managers/database/entities/Plugin";
export { default as Group } from "./managers/database/entities/Group";

// Utilities
export { Utils } from "@framedjs/shared";
export { DiscordUtils } from "./utils/discord/DiscordUtils";
export { EmbedHelper } from "./utils/discord/EmbedHelper";

// Types
export { Platform } from "./types/Platform";
export { PluginResolvable } from "./managers/database/types/PluginResolvable";
export { PrefixResolvable } from "./managers/database/types/PrefixResolvable";

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

// TypeORM export
import * as TypeORM from "typeorm";
export { TypeORM };
