# @framedjs/core

## 0.4.2

### Patch Changes

-   34c97ef: Release 0.4.2

    Bugfixes:

    -   Fixed the package install

## 0.4.1

### Patch Changes

-   588bef7: Release 0.4.1

    Bugfixes:

    -   If there's an prefix with an empty string, ANY command will be able to be triggered by its ID. Any specified prefix doesn't matter.

## 0.4.0

### Minor Changes

-   d8e7462: - Noteable Features: - Bot permissions

    -   Noteable Bugfixes:

        -   Prefix checks go from longest to smallest
        -   Utils.formatHrTime outputs proper numbers with smaller hrTime numbers

    -   Breaking Changes:
        -   Utils.hasPermission has been renamed to Utils.hasUserPermission
        -   Utils.sendPermissionErrorMessage has been renamed to Utils.sendBotPermissionErrorMessage

### Patch Changes

-   Updated dependencies [d8e7462]
    -   @framedjs/shared@0.2.0

## 0.3.0

### Patch Changes

-   5cf56b1: implement most of place system
-   55c2227: - Features:

    -   setupEvents is now async
    -   botOwners option can also use string
    -   better userPermissions
    -   Set providers through an object

    -   Bugfixes:
    -   DefaultProvider initalizes providers by itself now
    -   Discord ready events call consistency
    -   role check passes for specified Discord permission

    -   Breaking Changes:
    -   client.provider.place is now client.provider.places
    -   removed DefaultProvider, BaseProvider replaces it
    -   old provider setting no longer works; you'll need an object now
    -   function calls to DiscordUtils.getMessageFromLink need to remove the author parameter

-   da34f6b: Better inline options and import fixes

    -   Features: - Inline for help can be more controlled - (Unfinsihed) Discord Bot Missing Perms friendly error

    -   Bugfixes - All plugins, routes, commands, and events should get imported

-   9ab8eaa: Simpler event setup and minor tweaks
-   24d14d9: Many changes, preparing for release

    -   Features
    -   Providers for settings, prefix, and place
    -   Get certain variables from cache
    -   Footer can now use a string instead of an array of commands
    -   User and bot permissions for commands
    -   Classes for DiscordMessage and TwitchMessage (extends Message)
    -   Once you check via instanceof, their respective platform data,
        and platform string will be set appropriately
    -   Added nanoid as a dependency for place IDs
    -   Expanded permission system for Discord
    -   isAdmin and isOwner checks now exist; add admins and owners in
        ClientOptions, through each platform's respective object
    -   DiscordUtils Discohook parsers now support multiple messages

    -   Chores
    -   Updated dependencies

    -   Bug-fixes
    -   Pinning messages shouldn't re-trigger the command again
    -   Partials should be handled correctly in Client

    -   Refactors
    -   Used `x ?? y` syntax, replacing the `x ? x : y` syntax
    -   BREAKING: Forcing Node v14+
    -   BREAKING: Rename Message class to BaseMessage
    -   BREAKING: Moved lots of functionality from PluginManager into a new
        manager called CommandManager
    -   BREAKING: permissions in BaseCommand has been renamed to userPermissions
    -   BREAKING: renamed defaultHelpCommands to footer
    -   BREAKING: removed default import variables from the
        root of ClientOptions
    -   BREAKING: All TypeORM uses have been removed (such as DatabaseManager
        and entities). ClientOptions no longer requires a TypeORM connection to
        the database.
    -   BREAKING: PlaceManager has been removed; use the place and prefix
        provider instead
    -   BREAKING: moved sendHelpForCommand from PluginManager to BaseMessage
    -   BREAKING: sendHelpForCommand is no longer static
    -   BREAKING: DiscohookOutputData interface changes

## 0.3.0-next.6

### Patch Changes

-   d899ca5: - Features:

    -   setupEvents is now async
    -   botOwners option can also use string
    -   better userPermissions
    -   Set providers through an object

    -   Bugfixes:
    -   DefaultProvider initalizes providers by itself now
    -   Discord ready events call consistency
    -   role check passes for specified Discord permission

    -   Breaking Changes:
    -   client.provider.place is now client.provider.places
    -   removed DefaultProvider, BaseProvider replaces it
    -   old provider setting no longer works; you'll need an object now
    -   function calls to DiscordUtils.getMessageFromLink need to remove the author parameter

## 0.3.0-next.5

### Patch Changes

-   24d14d9: Many changes, preparing for release

    -   Features
    -   Providers for settings, prefix, and place
    -   Get certain variables from cache
    -   Footer can now use a string instead of an array of commands
    -   User and bot permissions for commands
    -   Classes for DiscordMessage and TwitchMessage (extends Message)
    -   Once you check via instanceof, their respective platform data,
        and platform string will be set appropriately
    -   Added nanoid as a dependency for place IDs
    -   Expanded permission system for Discord
    -   isAdmin and isOwner checks now exist; add admins and owners in
        ClientOptions, through each platform's respective object
    -   DiscordUtils Discohook parsers now support multiple messages

    -   Chores
    -   Updated dependencies

    -   Bug-fixes
    -   Pinning messages shouldn't re-trigger the command again
    -   Partials should be handled correctly in Client

    -   Refactors
    -   Used `x ?? y` syntax, replacing the `x ? x : y` syntax
    -   BREAKING: Forcing Node v14+
    -   BREAKING: Rename Message class to BaseMessage
    -   BREAKING: Moved lots of functionality from PluginManager into a new
        manager called CommandManager
    -   BREAKING: permissions in BaseCommand has been renamed to userPermissions
    -   BREAKING: renamed defaultHelpCommands to footer
    -   BREAKING: removed default import variables from the
        root of ClientOptions
    -   BREAKING: All TypeORM uses have been removed (such as DatabaseManager
        and entities). ClientOptions no longer requires a TypeORM connection to
        the database.
    -   BREAKING: PlaceManager has been removed; use the place and prefix
        provider instead
    -   BREAKING: moved sendHelpForCommand from PluginManager to BaseMessage
    -   BREAKING: sendHelpForCommand is no longer static
    -   BREAKING: DiscohookOutputData interface changes

## 0.3.0-next.4

### Patch Changes

-   9ab8eaa: Simpler event setup and minor tweaks

## 0.3.0-next.3

### Patch Changes

-   5cf56b1: implement most of place system

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
