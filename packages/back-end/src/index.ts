// Tries to get environmental variables if it doesn't exist
// const dotenv = require("dotenv").config({ path: `${process.cwd()}/../.env` });
// if (dotenv.error) {
// 	throw dotenv.error;
// }
// console.log(dotenv.parsed);

// import { createUser, showUser, User } from 'shared';
// const user: User = createUser('t7yang', 18);
// showUser(user);

// import { logger } from "shared";
// import { version } from "../../../package.json";
// import { version as backEndVersion } from "../package.json";

export { default as APIManager } from "./managers/APIManager";
export { default as PluginManager } from "./managers/PluginManager";
export { default as FramedClient } from "./structures/FramedClient";
export { default as FramedMessage } from "./structures/FramedMessage";

// import settings from "../../../settings.json";

// logger.info(`Launching Framed v${version}, back-end v${backEndVersion}.`);

// const framedClient = new FramedClient({
// 	defaultPrefix: ".",
// 	backEndVersion: backEndVersion,
// });
// framedClient.login(settings.token);
