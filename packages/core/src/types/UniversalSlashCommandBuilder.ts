import type {
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandGroupBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from "@discordjs/builders";

export type UniversalSlashCommandBuilder =
	| SlashCommandBuilder
	| Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
	| SlashCommandSubcommandBuilder
	| SlashCommandSubcommandsOnlyBuilder
	| SlashCommandSubcommandGroupBuilder;
