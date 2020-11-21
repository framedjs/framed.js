First, start with going to `packages/back-end/src`.

`index.ts` is where it starts.

Follow `framedClient.login()`.

`this.pluginManager.loadPluginsIn` is important. It will load the plugins, which will load other elements such as comamnd and event scripts.