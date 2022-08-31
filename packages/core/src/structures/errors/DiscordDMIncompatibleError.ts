import { FriendlyError } from "./FriendlyError";

export class DiscordDMIncompatibleError extends FriendlyError {
	friendlyName = "You can't use that in DMs!";

	constructor(message?: string) {
		super(message ?? "You'll need to be in a server in order to use that.");
	}
}
