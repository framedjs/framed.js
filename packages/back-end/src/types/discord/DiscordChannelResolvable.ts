import Discord from "discord.js"

/**
 * This can be set as the channel, channel ID, or name
 */
export type DiscordChannelResolvable = Discord.Channel | Discord.Snowflake | string;