import { framedClient } from "..";
import { ClientEvents } from "discord.js";

type EventType = keyof ClientEvents;

export interface EventListener {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	listen: (...args: any) => Promise<any>;
}

export function Event(event: EventType | string) {
	return function (target: { new (): EventListener }): void {
		framedClient.client.on(event, new target().listen);
	};
}
