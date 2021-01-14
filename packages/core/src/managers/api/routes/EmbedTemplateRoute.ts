import { BaseRouter } from "../../../structures/BaseRouter";
import { Client } from "../../../structures/Client";
import { EmbedHelper } from "../../../utils/discord/EmbedHelper";

export default class extends BaseRouter {
	constructor(client: Client) {
		super(client);
		
		this.router.get("/api/v0/discord/embedtemplate", async ctx => {
			const footerUrl = ctx.query.footerUrl || "";
			const commandUsed = ctx.query.commandUsed || "";

			const json = JSON.stringify(
				EmbedHelper.getTemplateRaw(
					client.helpCommands,
					// Work-around to get the right color, since it defaults to #fff
					EmbedHelper.getColorWithFallback(undefined, "#e52a64"),
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
