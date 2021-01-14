import { Logger } from "@framedjs/logger";
import Options from "../interfaces/other/RequireAllOptions";
import { Client } from "../structures/Client";
import { DiscordUtils } from "../utils/discord/DiscordUtils";
import util from "util";
import Koa from "koa";
import Router from "koa-router";
import path from "path";
import { BaseRouter } from "../structures/BaseRouter";

export class APIManager {
	static readonly defaultPath = path.join(__dirname, "api", "routes");
	readonly app = new Koa();
	readonly router = new Router();

	/**
	 * Starts listening for API queries
	 * @param client
	 */
	constructor(readonly client: Client) {
		// No clue if this is a good idea
		// https://inviqa.com/blog/how-build-basic-api-typescript-koa-and-typeorm
		this.app.use(async (ctx: Koa.Context, next: () => Promise<unknown>) => {
			try {
				const start = Date.now();
				await next();
				const ms = Date.now() - start;
				Logger.http(`${ctx.method} ${ctx.url} - ${ms}ms`);
			} catch (error) {
				ctx.status = 500;
				error.status = ctx.status;
				ctx.body = { error };
				ctx.app.emit("error", error, ctx);
			}
		});

		// Application error logging
		this.app.on("error", Logger.error);

		// Send to port
		const port: number = Number(process.env.API_PORT) || 42069;
		this.app.listen(port);
		Logger.http(`API is listening on port ${port}`);
	}

	/**
	 * Loads routes
	 * @param options RequireAll options
	 */
	loadRoutesIn(options: Options): void {
		const routes = DiscordUtils.importScripts(options) as (new (
			client: Client
		) => BaseRouter)[];
		Logger.silly(`Routers: ${util.inspect(routes)}`);
		this.loadRoutes(routes);
	}

	/**
	 * Loads routes
	 * @param routes
	 */
	loadRoutes<T extends BaseRouter>(
		routes: (new (client: Client) => T)[]
	): void {
		for (const router of routes) {
			const initRouter = new router(this.client);
			// Logger.debug(`initRouter: ${util.inspect(initRouter)}`);
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
