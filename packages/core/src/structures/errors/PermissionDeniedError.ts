import { FriendlyError } from "./FriendlyError";

export class PermissionDeniedError extends FriendlyError {
	constructor(message: string) {
		super(message);
		this.name = PermissionDeniedError.name;
	}
}
