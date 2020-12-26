import { FriendlyError } from "./FriendlyError";

export class PermissionDeniedError extends FriendlyError {
	constructor(description: string) {
		super(description);
		this.name = PermissionDeniedError.name;
	}
}
