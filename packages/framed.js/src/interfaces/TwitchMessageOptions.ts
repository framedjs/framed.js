import { ChatClient } from "twitch-chat-client";

export interface TwitchMessageOptions {
	chatClient: ChatClient;
	channel: string;
	user: string;
}
