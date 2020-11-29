// Based off of node-url-shortener on npm

import Axios from "axios";

interface Callback {
	(shortedUrl?: string, error?: Error): void;
}

export async function shorten(url: string, callback: Callback): Promise<void> {
	const baseUrl = "https://is.gd/create.php?format=simple&url=";

	try {
		const results = await Axios.get(baseUrl + url);
		const response = results.data;
		callback(response, undefined);
	} catch (err) {
		callback(undefined, err.stack);
	}
}
