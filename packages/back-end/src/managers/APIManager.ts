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
				const start = Date.now();
				await next();
				const ms = Date.now() - start;
				logger.http(`${ctx.method} ${ctx.url} - ${ms}ms`);
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
		const port: number = Number(process.env.API_PORT) || 42069;
		this.app.listen(port);
		logger.http(`API is listening on port ${port}`);
	}

	/**
	 * Loads routes
	 * @param options RequireAll options
	 */
	loadRoutesIn(options: Options): void {
		const routes = DiscordUtils.importScripts(options) as (new (
			framedClient: FramedClient
		) => BaseRouter)[];
		logger.silly(`Routers: ${util.inspect(routes)}`);
		this.loadRoutes(routes);
	}

	/**
	 * Loads routes
	 * @param routes
	 */
	loadRoutes<T extends BaseRouter>(
		routes: (new (framedClient: FramedClient) => T)[]
	): void {
		for (const router of routes) {
			const initRouter = new router(this.framedClient);
			// logger.debug(`initRouter: ${util.inspect(initRouter)}`);
			this.loadRoute(initRouter);
		}
	}

	/**
	 * Loads route
	 * @param router
	 */
	loadRoute<T extends BaseRouter>(router: T): void {
		this.router.use(router.router.routes());
		this.router.use(router.router.allowedMethods());
		this.app.use(this.router.routes());
		this.app.use(this.router.allowedMethods());
	}
}
