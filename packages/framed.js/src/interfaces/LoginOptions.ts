import { ChatClientOptions } from "twitch-chat-client/lib/ChatClient";

export interface LoginOptions {
	type: "discord" | "twitch";
	discord?: DiscordLoginOptions;
	twitch?: TwitchLoginOptions;
}

export interface DiscordLoginOptions {
	token?: string;
}

export interface TwitchLoginOptions {
	accessToken: string;
	clientId: string;
	clientSecret: string;
	refreshToken: string;
	clientOptions: ChatClientOptions;
}
