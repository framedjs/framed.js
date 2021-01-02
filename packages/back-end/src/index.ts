import fs from "fs";
import path from "path";

// Managers
export { default as APIManager } from "./managers/APIManager";
export { default as PluginManager } from "./managers/PluginManager";
export { default as DatabaseManager } from "./managers/DatabaseManager";

// Structures
export { default as FramedClient } from "./structures/FramedClient";
export { default as FramedMessage } from "./structures/FramedMessage";

export { BasePlugin } from "./structures/BasePlugin";
export { BaseCommand } from "./structures/BaseCommand";
export { BaseSubcommand } from "./structures/BaseSubcommand";
export { BaseEvent } from "./structures/BaseEvent";
export { BaseRouter } from "./structures/BaseRouter";

// Interfaces
export { FramedArgument } from "./interfaces/FramedArgument";
// export { FramedArgumentOptions } from "./interfaces/FramedArgumentOptions"
// export { FramedClientOptions } from "./interfaces/FramedClientOptions";
// export { FramedDiscordMessage } from "./interfaces/FramedDiscordMessage";
// export { FramedDiscordMessageOptions } from "./interfaces/FramedDiscordMessageOptions";
export { FramedFoundCommandData as FramedCommandData } from "./interfaces/FramedFoundCommandData";
export { FramedMessageOptions } from "./interfaces/FramedMessageOptions";
export { FramedLoginOptions } from "./interfaces/FramedLoginOptions";

export { QuoteSections } from "./interfaces/QuoteSections";
export { BaseCommandOptions } from "./interfaces/BaseCommandOptions";

export { HelpData } from "./interfaces/HelpData";
export { ResponseData } from "./managers/database/interfaces/ResponseData";

// TypeORM Entities
export { default as Command } from "./managers/database/entities/Command";
export { default as Prefix } from "./managers/database/entities/Prefix";
export { default as Response } from "./managers/database/entities/Response";
export { default as Plugin } from "./managers/database/entities/Plugin";
export { default as Group } from "./managers/database/entities/Group";

// Utilities
export { default as EmbedHelper } from "./utils/discord/EmbedHelper";
export { default as DiscordUtils } from "./utils/discord/DiscordUtils";

// Resolvable types
export { PluginResolvable } from "./managers/database/types/PluginResolvable";
export { PrefixResolvable } from "./managers/database/types/PrefixResolvable";

// Errors
export { FriendlyError } from "./structures/errors/FriendlyError";
export { InvalidError } from "./structures/errors/InvalidError";
export { NotFoundError } from "./structures/errors/NotFoundError";
export { PermissionDeniedError } from "./structures/errors/PermissionDeniedError";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const version = require("../package.json").version as string;
export { version };
