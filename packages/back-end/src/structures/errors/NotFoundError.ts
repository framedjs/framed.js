import { FriendlyError } from "./FriendlyError";

export class NotFoundError extends FriendlyError {
	constructor(description: string) {
		super(description);
		this.name = NotFoundError.name;
	}
}
