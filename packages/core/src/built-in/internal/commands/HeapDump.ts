import { Logger } from "@framedjs/logger";
import { BaseCommand } from "../../../structures/BaseCommand";
import { BaseMessage } from "../../../structures/BaseMessage";
import { BasePlugin } from "../../../structures/BasePlugin";
import v8 from "v8";
import fs from "fs";
import path from "path";

/**
 * Heap dump command
 *
 * Note: this HAS to be a user command, or else the dump
 * will hang and refuse to work.
 */
export default class HeapDump extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "heapdump",
			about: "Creates a heap dump in the data/dumps folder",
			botPermissions: {
				discord: {
					permissions: ["SEND_MESSAGES"],
				},
			},
			userPermissions: {
				botOwnersOnly: true,
				checkAutomatically: false,
			},
		});
	}

	async run(msg: BaseMessage): Promise<boolean> {
		// Manually checks user permission to stay silent template
		const permsResult = this.checkUserPermissions(
			msg,
			this.userPermissions
		);
		if (!permsResult.success) {
			Logger.warn(
				`${this.id} called by user without permission (${msg.discord?.author.id})`
			);
			return false;
		}

		// Rudiementary file name check and create
		const regex = /^[a-zA-Z0-9_\- ]*$/;
		const argsContent = msg.getArgsContent().trim();
		let tempFileName = `${Date.now()}`;
		if (argsContent && argsContent.match(regex)) {
			tempFileName = `${argsContent} ${tempFileName}`;
		}

		// Creates directory if it doesn't exist
		const directory = path.join(process.cwd() + `/data/dumps/`);
		if (!fs.existsSync(directory)) {
			fs.mkdirSync(directory);
		}

		const fileName = `${tempFileName}.heapsnapshot`;
		const fullDir = `${directory}${fileName}`;

		// Indicate starting heap dump
		Logger.info(`Heap dumping into ${path.resolve(fullDir)}`);
		await msg.send("Heap dumping...");

		// Creates the snapshot, writes to file
		const snapshotStream = v8.getHeapSnapshot();
		const fileStream = fs.createWriteStream(fullDir);
		snapshotStream.pipe(fileStream);

		// Once finished, send a message to logs and chat
		fileStream.once("finish", async () => {
			const stats = fs.statSync(fullDir);
			const newContent = `Done! The dump was ${(
				stats.size /
				(1024 * 1024)
			).toFixed(1)} MiB.`;
			Logger.info(newContent);
			await msg.send(newContent);
		});

		return false;
	}
}
