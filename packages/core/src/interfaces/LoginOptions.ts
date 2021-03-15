import { ChatClientOptions } from "twitch-chat-client/lib/ChatClient";
import { ClientOptions } from "discord.js";

export interface LoginOptions {
	type: "discord" | "twitch";
	discord?: DiscordLoginOptions;
	twitch?: TwitchLoginOptions;
}

export interface DiscordLoginOptions {
	token?: string;
	clientOptions?: ClientOptions;
}

export interface TwitchLoginOptions {
	accessToken: string;
	clientId: string;
	clientSecret: string;
	refreshToken: string;
	clientOptions: ChatClientOptions;
}
