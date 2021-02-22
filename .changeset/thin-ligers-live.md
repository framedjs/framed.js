---
"@framedjs/core": patch
---

Many changes, preparing for release

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
