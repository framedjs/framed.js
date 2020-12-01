import BaseRouter from "../../../structures/BaseRouter";
import FramedClient from "../../../structures/FramedClient";
import EmbedHelper from "../../../utils/discord/EmbedHelper";
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

			const authorAvatarUrl = ctx.query.authorAvatarUrl || "";
			const commandUsed = ctx.query.commandUsed || "";

			const json = JSON.stringify(
				EmbedHelper.getTemplateRaw(
					botUsername,
					framedClient.helpCommands,
					EmbedHelper.getColorWithFallback(undefined),
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
