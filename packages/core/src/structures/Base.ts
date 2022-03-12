import { Client } from "./Client";

export abstract class Base {
	constructor(public readonly client: Client) {}
}
