import { FriendlyError } from "./FriendlyError";
import { oneLine, stripIndents } from "common-tags";

export class DiscordUnableToDMError extends FriendlyError {
	static instructionsToSolve = stripIndents`
		Please change your privacy settings.
		
		${oneLine`On PC, right-click the server, or on mobile, hold the server icon.
		Then, go to **Privacy Settings > Direct Messages > Allow direct messages from
		server members.**`}`;

	constructor(message?: string) {
		super(
			message ??
				`I'm unable to send you a DM! ${DiscordUnableToDMError.instructionsToSolve}`
		);
	}
}
