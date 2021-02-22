import { ChatClient } from "twitch-chat-client";
import { ApiClient } from "twitch";

export interface TwitchMessageData {
	api: ApiClient;
	chat: ChatClient;
	channel: string;
	user: string;
}
