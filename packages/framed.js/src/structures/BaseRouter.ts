import { Client } from "./Client";
import Router from "koa-router";

export abstract class BaseRouter {
	readonly router = new Router();

	constructor(readonly client: Client) {}
}
