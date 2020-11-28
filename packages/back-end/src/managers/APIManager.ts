import { logger } from "shared";
import Options from "../interfaces/RequireAllOptions";
import BaseRouter from "../structures/BaseRouter";
import FramedClient from "../structures/FramedClient";
import DiscordUtils from "../utils/discord/DiscordUtils";
import util from "util";
import Koa from "koa";
import Router from "koa-router";

export default class APIManager {
	public readonly app = new Koa();
	public readonly router = new Router();
	public routers = new Map<string, BaseRouter>();

	/**
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

		// Initial route
		this.app.use(async (ctx: Koa.Context) => {
			ctx.body = "Hello world";
		});

		// Application error logging
		this.app.on("error", logger.error);

		const PORT: number = Number(process.env.API_PORT) || 42069;
		this.app.listen(PORT);
	}

	/**
	 * Loads the routers
	 * @param options RequireAll options
	 */
	loadRoutersIn(options: Options): void {
		const routers = DiscordUtils.importScripts(options);
		logger.debug(`routers: ${util.inspect(routers)}`);
		this.loadRouters(routers);
	}

	/**
	 *
	 * @param routers
	 */
	loadRouters(routers: Router[]): void {
		for (const router of routers) {
			// logger.debug(`initrouter: ${util.inspect(initrouter)}`);
			this.loadRouter(router);
		}
	}

	/**
	 *
	 * @param router
	 */
	loadRouter(router: Router): void {
		// if (this.routers.get(router.id)) {
		// 	logger.error(`router with id ${router.id} already exists!`);
		// 	return;
		// }

		// this.routers.set(router.id, router);

		this.router.use(router.router.routes());

		// logger.verbose(
		// 	`Finished loading router ${router.name} v${router.version}.`
		// );
	}
}
