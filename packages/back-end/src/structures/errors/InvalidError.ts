import { FriendlyError } from "./FriendlyError";

export class InvalidError extends FriendlyError {
	friendlyName = "Invalid";

	constructor(
		options: {
			input: string;
			name?: string;
		},
		reason?: string
	) {
		super();

		if (!options.name) {
			options.name = "Input";
		}
		this.friendlyName = `${options.name} ${this.friendlyName}`;
		this.message = `The ${options.name} \`${options.input}\` is invalid.`;
		if (reason) {
			this.message += ` ${reason}`;
		}

		this.name = InvalidError.name;
	}
}
