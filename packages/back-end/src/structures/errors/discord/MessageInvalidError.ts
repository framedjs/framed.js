import { InvalidError } from "../InvalidError";

export class MessageInvalidError extends InvalidError {
	constructor(description: string) {
		super(description);
		this.name = MessageInvalidError.name;
	}
}
