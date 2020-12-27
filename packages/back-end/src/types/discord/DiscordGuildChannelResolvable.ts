import Discord from "discord.js"

/**
 * This can be set as the channel, channel ID, or name
 */
export type DiscordGuildChannelResolvable = Discord.GuildChannel | Discord.Snowflake | string;