import { BaseRouter } from "../../../structures/BaseRouter";
import FramedClient from "../../../structures/FramedClient";
import EmbedHelper from "../../../utils/discord/EmbedHelper";

export default class extends BaseRouter {
	constructor(framedClient: FramedClient) {
		super(framedClient);
		
		this.router.get("/api/v0/discord/embedtemplate", async ctx => {
			const footerUrl = ctx.query.footerUrl || "";
			const commandUsed = ctx.query.commandUsed || "";

			const json = JSON.stringify(
				EmbedHelper.getTemplateRaw(
					framedClient.helpCommands,
					EmbedHelper.getColorWithFallback(undefined),
					footerUrl,
					undefined,
					commandUsed
				)
			);

			ctx.set("Content-Type", "application/json");
			ctx.body = json;
		});
	}
}
