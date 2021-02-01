import { ChatClient } from "twitch-chat-client";

export interface TwitchMessageOptions {
	chat: ChatClient;
	channel: string;
	user: string;
}
