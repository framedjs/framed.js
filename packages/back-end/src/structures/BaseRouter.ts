import FramedClient from "./FramedClient";
import Router from "koa-router";

export default abstract class BaseRouter {
	public readonly router = new Router();

	constructor(public readonly framedClient: FramedClient) {}
}
