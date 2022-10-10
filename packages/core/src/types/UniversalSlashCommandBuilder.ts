import type {
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export type UniversalSlashCommandBuilder =
	| SlashCommandBuilder
	| Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
	| SlashCommandSubcommandBuilder
	| SlashCommandSubcommandsOnlyBuilder
	| SlashCommandSubcommandGroupBuilder;
