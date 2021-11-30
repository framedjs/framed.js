import type { ChatClientOptions } from "twitch-chat-client/lib/ChatClient";
import type { ClientOptions } from "discord.js";

export interface DiscordLoginOptions {
	type: "discord";
	token?: string;
	clientOptions?: ClientOptions;
}

export interface TwitchLoginOptions {
	type: "twitch";
	accessToken: string;
	clientId: string;
	clientSecret: string;
	refreshToken: string;
	clientOptions: ChatClientOptions;
}
