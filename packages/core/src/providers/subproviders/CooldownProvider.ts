import { CooldownData } from "../../interfaces/CooldownData";
import { Provider } from "./Provider";

export class CooldownProvider extends Provider {
	/**
	 * Data cached in memory.
	 */
	protected cache = new Map<string, CooldownData[]>();

	/**
	 * Get an array of the cache.
	 */
	get array(): [string, CooldownData[]][] {
		return Array.from(this.cache);
	}

	async init(): Promise<void> {
		return;
	}

	async get(options: {
		userId: string;
		commandId: string;
	}): Promise<CooldownData | undefined> {
		const foundData = this.cache.get(options.userId);
		return foundData?.find(
			element => element.commandId == options.commandId
		);
	}

	async set(options: {
		userId: string;
		commandId: string;
		cooldownDate: Date;
	}): Promise<void> {
		const foundCooldownData = this.cache.get(options.userId);
		const dataToAppend: CooldownData = {
			commandId: options.commandId,
			endDate: options.cooldownDate,
		};
		if (foundCooldownData) {
			const foundCommandCooldownData = foundCooldownData.find(
				element => element.commandId == options.commandId
			);
			if (foundCommandCooldownData) {
				foundCommandCooldownData.endDate = options.cooldownDate;
			} else {
				foundCooldownData.push({
					commandId: options.commandId,
					endDate: options.cooldownDate,
				});
			}
		} else {
			this.cache.set(options.userId, [dataToAppend]);
		}
	}

	async delete(options: {
		userId: string;
		commandId: string;
	}): Promise<boolean> {
		const foundUserData = this.cache.get(options.userId);
		if (foundUserData) {
			const foundCooldownData = foundUserData.find(
				element => element.commandId == options.commandId
			);
			if (foundCooldownData) {
				const newArray: CooldownData[] = [
					...foundUserData.filter(
						element => element.commandId != options.commandId
					),
				];

				if (newArray.length == 0) {
					this.cache.delete(options.userId);
				} else {
					this.cache.set(options.userId, newArray);
				}

				return true;
			}
		}

		return false;
	}
}
