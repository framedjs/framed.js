import { ChatClientOptions } from "twitch-chat-client/lib/ChatClient";

export interface FramedLoginOptions {
	type: "discord" | "twitch";
	discord?: FramedDiscordLoginOptions;
	twitch?: FramedTwitchLoginOptions;
}

export interface FramedDiscordLoginOptions {
	token?: string;
}

export interface FramedTwitchLoginOptions {
	accessToken: string;
	clientId: string;
	clientSecret: string;
	refreshToken: string;
	clientOptions: ChatClientOptions;
}
