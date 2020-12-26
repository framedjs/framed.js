import { FriendlyError } from "./FriendlyError";

export class InvalidError extends FriendlyError {
	constructor(description: string) {
		super(description);
		this.name = InvalidError.name;
	}
}
