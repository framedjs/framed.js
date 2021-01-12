// Managers
export { APIManager } from "./managers/APIManager";
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
// export { ClientOptions } from "./interfaces/ClientOptions";
// export { DiscordMessage } from "./interfaces/DiscordMessage";
// export { DiscordMessageOptions } from "./interfaces/DiscordMessageOptions";
export { FoundCommandData } from "./interfaces/FoundCommandData";
export { MessageOptions } from "./interfaces/MessageOptions";
export { LoginOptions } from "./interfaces/LoginOptions";

export { BaseCommandOptions } from "./interfaces/BaseCommandOptions";

export { DiscohookOutputData } from "./interfaces/other/DiscohookOutputData";
export { HelpData } from "./interfaces/other/HelpData";
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

// Resolvable types
export { PluginResolvable } from "./managers/database/types/PluginResolvable";
export { PrefixResolvable } from "./managers/database/types/PrefixResolvable";

// Errors
export { FriendlyError } from "./structures/errors/FriendlyError";
export { InvalidError } from "./structures/errors/InvalidError";
export { NotFoundError } from "./structures/errors/NotFoundError";
export { PermissionDeniedError } from "./structures/errors/PermissionDeniedError";

// Version
// eslint-disable-next-line @typescript-eslint/no-var-requires
const version = require("../package.json").version as string;
export { version };

// Logger
export { Logger, defaultLevels, defaultFormat } from "@framedjs/logger";

export default this;