import { ChatClient } from "twitch-chat-client";

export interface TwitchMessage {
	chatClient: ChatClient
	channel: string;
	user: string;
}
