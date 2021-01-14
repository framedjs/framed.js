First, start with going to `packages/framed/src`.

`index.ts` is where it starts.

Follow `client.login()`.

`this.pluginManager.loadPluginsIn` is important. It will load the plugins, which will load other elements such as comamnd and event scripts.