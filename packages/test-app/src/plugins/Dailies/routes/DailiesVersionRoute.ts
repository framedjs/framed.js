import { BaseRouter, DatabaseManager, FramedClient } from "back-end";
import { logger, Utils } from "shared";

export default class extends BaseRouter {
	constructor(framedClient: FramedClient) {
		super(framedClient);

		this.router.post("/api/v0/dailies/version", async ctx => {
			const version = ctx.query.version;
			logger.debug(`Dailies version: ${version}`);
			try {
				if (!version) {
					throw new Error("No version query found in URL.");
				}

				const pluginRepo = framedClient.database.pluginRepo;
				const id = "com.geekoverdrivestudio.dailies";
				const plugin = await pluginRepo.findOne({
					where: { id: id },
				});

				if (!plugin) {
					throw new ReferenceError(
						Utils.util.format(
							DatabaseManager.errorNoConnection,
							"plugin",
							id
						)
					);
				}

				plugin.data.version = version;
				await pluginRepo.save(plugin);

				ctx.status = 201;
			} catch (error) {
				ctx.body = error;
				ctx.status = 400;
			}
		});
	}
}
