# @framedjs/core

## 0.3.0-next.2

### Patch Changes

-   da34f6b: Better inline options and import fixes

    -   Features: - Inline for help can be more controlled - (Unfinsihed) Discord Bot Missing Perms friendly error

    -   Bugfixes - All plugins, routes, commands, and events should get imported

## 0.3.0-next.1

### Patch Changes

-   2223feb: I think I forgot to build, unpublished instead of deprecated. Thought Verdaccio was being used, but forgot to save the .npmrc file.

## 0.3.0-next.0

### Minor Changes

-   ed46475: 0.3.0 prerelease

    -   Guild or Twitch channel specific prefixes
    -   Twitch message now carries ApiClient
    -   "chatClient" renamed to just "chat"
    -   Some command getters and parsers are now async
    -   new Message calls need message.getMessageElements() to get prefix,
        command, and args variables set on the Message instance.
    -   Removed unused Help interfaces from PluginManager
    -   Formatting must be done per each ran command
        (use msg.client.formatting)

## 0.2.2

### Patch Changes

-   807dfd4: Forgot to build. v0.2.0 and v0.2.1 are the same code-wise.

## 0.2.1

### Patch Changes

-   a7e3bfa: Changed behavior of EmbedHelper to not use process.env.PREFIX, as it was a remnant of old code.

## 0.2.0

### Minor Changes

-   2386d4a: Release v0.2.0

    Features:

    -   Notes entry
    -   Better "Check out:" embed text
        -   Can be set to your own commands or nothing

    Bug fixes:

    -   Added Discord.js (also Twitch) re-export from Framed. This is to have `new Discord.MessageEmbed()` work properly for code outside the framework.

## 0.1.0

### Minor Changes

-   2350d65: First release of framed.js

### Patch Changes

-   Updated dependencies [2350d65]
    -   @framedjs/logger@0.1.0
    -   @framedjs/shared@0.1.0
