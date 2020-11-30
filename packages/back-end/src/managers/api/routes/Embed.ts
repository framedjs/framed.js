import BaseRouter from "packages/back-end/src/structures/BaseRouter";
import FramedClient from "packages/back-end/src/structures/FramedClient";
import EmbedHelper from "packages/back-end/src/utils/discord/EmbedHelper";
import { Utils } from "shared";

export default class extends BaseRouter {
	constructor(framedClient: FramedClient) {
		super(framedClient);

		// this.router.param("icon_url", (id, ctx, next) => {
		// 	ctx.
		// 	return next();
		// })

		this.router.get("/api/discord/embedtemplate", async ctx => {
			const botUsername = framedClient.client.user?.username
				? framedClient.client.user?.username
				: "(undefined username)";
			const botAvatarUrl = Utils.turnUndefinedIfNull(
					framedClient.client.user?.avatarURL({
					dynamic: true,
				})
			) as string | undefined; 

			const authorAvatarUrl = "";
			const commandUsed = "";

			const json = JSON.stringify(
				EmbedHelper.getTemplateRaw(
					botUsername,
					framedClient.helpCommands,
					"#e91e63",
					botAvatarUrl,
					authorAvatarUrl,
					undefined,
					commandUsed,
				)
			);

			ctx.set("Content-Type", "application/json");
			ctx.body = json;
		});
	}
}
