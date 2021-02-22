import { Base } from "../structures/Base";
import { BaseArgument } from "../structures/BaseArgument";
import { Client } from "../structures/Client";

export class ArgumentManager extends Base {
	map = new Map<string, BaseArgument>();

	constructor(client: Client) {
		super(client);
	}
}