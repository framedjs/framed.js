import { FriendlyError } from "./FriendlyError";

export class InternalError extends FriendlyError {
	friendlyName = "An Internal Error Occured";

	constructor(message: string) {
		super(message);
		this.name = InternalError.name;
	}
}
