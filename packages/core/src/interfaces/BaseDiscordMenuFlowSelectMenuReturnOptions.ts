import { PageNotFoundError } from "../structures/errors/PageNotFoundError";

export interface BaseDiscordMenuFlowSelectMenuReturnOptions {
	pageNotFoundError?: PageNotFoundError;
	passthrough?: boolean;
}
