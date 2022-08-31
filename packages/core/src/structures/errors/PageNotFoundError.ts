import { InternalError } from "./InternalError";

export class PageNotFoundError extends InternalError {
	friendlyName = "Page Not Found";

	constructor(message: string) {
		super(message);
		this.name = PageNotFoundError.name;
	}
}
