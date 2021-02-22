import { Base } from "../structures/Base";
import { Client } from "../structures/Client";

export abstract class BaseArgument extends Base {
	constructor(client: Client) {
		super(client);
	}

	abstract parse(): Promise<unknown>; 
}