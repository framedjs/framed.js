import { logger } from "shared";
import Options from "../interfaces/RequireAllOptions";
import FramedClient from "../structures/FramedClient";
import DiscordUtils from "../utils/discord/DiscordUtils";
import util from "util";
import Koa from "koa";
import Router from "koa-router";
import path from "path";
import { BaseRouter } from "../structures/BaseRouter";

export default class APIManager {
	public static readonly defaultPath = path.join(__dirname, "api", "routes");
	public readonly app = new Koa();
	public readonly router = new Router();

	/**
	 * Starts listening for API queries
	 * @param framedClient
	 */
	constructor(public readonly framedClient: FramedClient) {
		// No clue if this is a good idea
		// https://inviqa.com/blog/how-build-basic-api-typescript-koa-and-typeorm
		this.app.use(async (ctx: Koa.Context, next: () => Promise<unknown>) => {
			try {
				await next();
			} catch (error) {
				ctx.status = 500;
				error.status = ctx.status;
				ctx.body = { error };
				ctx.app.emit("error", error, ctx);
			}
		});

		// Application error logging
		this.app.on("error", logger.error);

		// Send to port
		const PORT: number = Number(process.env.API_PORT) || 42069;
		this.app.listen(PORT);
	}

	/**
	 * Loads routes
	 * @param options RequireAll options
	 */
	loadRoutersIn(options: Options): void {
		const routes = DiscordUtils.importScripts(options);
		logger.debug(`Routers: ${util.inspect(routes)}`);
		this.loadRouters(routes);
	}

	/**
	 * Loads routes
	 * @param routes
	 */
	loadRouters<T extends BaseRouter>(
		routes: (new (framedClient: FramedClient) => T)[]
	): void {
		for (const router of routes) {
			const initRouter = new router(this.framedClient);
			// logger.debug(`initRouter: ${util.inspect(initRouter)}`);
			this.loadRouter(initRouter);
		}
	}

	/**
	 * Loads routes
	 * @param router
	 */
	loadRouter<T extends BaseRouter>(router: T): void {
		this.router.use(router.router.routes());
		this.router.use(router.router.allowedMethods());
		this.app.use(this.router.routes());
		this.app.use(this.router.allowedMethods());
	}
}
