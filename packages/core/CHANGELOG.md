# @framedjs/core

## 0.12.0-next.3

### Minor Changes

-   c90e307: dynamic EmbedHelper.defaultColor, via always reading the environment variable. Also includes future subcommand fixes.

## 0.12.0-next.2

### Patch Changes

-   1f45700: fix: message find regression

## 0.12.0-next.1

### Minor Changes

-   0e48f08: Debug env vars, better logs, specify message args in getMessageWithRenderOptions()

## 0.12.0-next.0

### Minor Changes

-   0dc4216: Update @discordjs/builder and rest, two-channel permission handling

## 0.11.1

### Patch Changes

-   c48b72b: Fix token in options, fetching messages by message link, and logging fixes

## 0.11.0

### Minor Changes

-   5c0d6b6: feat: pass args in menu flows, customId compression (via lz-string)

## 0.10.1

### Patch Changes

-   2d9c4d8: fix!: attempt fix of missing guild.me, ephemeral setting for certain interactions

    BREAKING: the non-static BaseDiscordMenuFlow.getMessage() method has been removed in favor for DiscordUtils.

## 0.10.0

### Minor Changes

-   9becebb: feat: page number parse by default

    -   fix!: "checkOriginalUser" typo

-   1b9cbbf: feat: menu flow page types
-   f5cb782: Add InternalError, and DiscordUtils.getMessageFromBaseMessage()
-   f4436ba: feat: add useful functions to menu flow system
-   034f374: feat: Discord menu flows

### Patch Changes

-   b7b08ed: Various breaking refactors:

    -   refactor!: remove koa and BaseRouter
    -   refactor!: change sendSeparateReply default

-   29a086e: fix: false emoji parses

    fix: bot permission @everyone message

-   Updated dependencies [034f374]
    -   @framedjs/shared@0.3.0

## 0.10.0-next.6

### Minor Changes

-   9becebb: feat: page number parse by default

    -   fix!: "checkOriginalUser" typo

## 0.10.0-next.5

### Minor Changes

-   f4436ba: feat: add useful functions to menu flow system

## 0.10.0-next.4

### Patch Changes

-   29a086e: fix: false emoji parses

    fix: bot permission @everyone message

## 0.10.0-next.3

### Patch Changes

-   b7b08ed: Various breaking refactors:

    -   refactor!: remove koa and BaseRouter
    -   refactor!: change sendSeparateReply default

## 0.10.0-next.2

### Minor Changes

-   1b9cbbf: feat: menu flow page types

## 0.10.0-next.1

### Minor Changes

-   034f374: feat: Discord menu flows

### Patch Changes

-   Updated dependencies [034f374]
    -   @framedjs/shared@0.3.0-next.0

## 0.10.0-next.0

### Minor Changes

-   f5cb782: Add InternalError, and DiscordUtils.getMessageFromBaseMessage()

## 0.9.4

### Patch Changes

-   3678180: fix: parse string as dates when needed

## 0.9.3

### Patch Changes

-   db77fc5: fix: cooldown set automatically

## 0.9.2

### Patch Changes

-   0c7de52: fix: crash on reload all

## 0.9.1

### Patch Changes

-   a6cc15d: fix: remove screaming log in internal plugin

## 0.9.0

### Minor Changes

-   21b46c8: feat!: remove array for login options
-   60796ac: feat: logging variable tweaks, better reload, unload
-   66d71b3: feat: default internal plugin
-   29cbd2d: fix!: discordInteraction typo in BaseCommand

### Patch Changes

-   acdc6d0: fix: check for reply, before sending first reply
-   2855605: fix: stop context menu global to need explicitly set to true
-   057d8de: fix: discord.js types

## 0.9.0-next.5

### Patch Changes

-   057d8de: fix: discord.js types

## 0.9.0-next.4

### Patch Changes

-   acdc6d0: fix: check for reply, before sending first reply

## 0.9.0-next.3

### Minor Changes

-   29cbd2d: fix!: discordInteraction typo in BaseCommand

## 0.9.0-next.2

### Patch Changes

-   2855605: fix: stop context menu global to need explicitly set to true

## 0.9.0-next.1

### Minor Changes

-   60796ac: feat: logging variable tweaks, better reload, unload

## 0.9.0-next.0

### Minor Changes

-   21b46c8: feat!: remove array for login options
-   66d71b3: feat: default internal plugin

## 0.8.2

### Patch Changes

-   e820968: fix: prune silly logs

## 0.8.1

### Patch Changes

-   1b6156b: fix: send ephemeral permission errors when possible
-   880d954: fix slash command builder times, and custom member input in DiscordInteraction
-   1d84ce0: fix: if interaction message exists, apply to DiscodInteration
-   af23f61: fix: excessive logs for interactions

## 0.8.0

### Minor Changes

-   6760492: feat: add emoji and string data to export
-   25d14ee: Better Discord interaction helpers and support
-   f6e644d: Changes:

    -   feat: export ArgumentOptions
    -   fix: deferred interactions for sendErrorMessage
    -   fix: enable subcommands for slash commands
    -   refactor: simplify msg.discordInteraction.interaction

-   7e589ff: feat: add DiscordUtils.resolveTextChannel
-   ce0f4ac: - fix: discord interaction user permission check
    -   refactor: log "/" instead of "slash command"
-   a1d30c2: feat: expose @discordjs/rest and builders
-   3ba183b: feat: msg.send support Discord interaction replies
-   eb8c183: Changes:

    -   feat: export all of SlashCommandBuilder
    -   fix: slash subcommands implementation

-   31714f8: Changes:

    -   feat: arguments contain the wrapping quotes
    -   feat: start + end quote characters in Argument
    -   fix: disallow quote char mixes in args parsing

### Patch Changes

-   cbfcce0: fix: slash subcommands types
-   27a57e2: feat: minor edits to logging in CommandManager
-   f1413f1: Changes:

    -   feat: handleFriendlyError function in CommandManager
    -   feat!: increase permissions functionality
    -   feat: change interaction comamnd name behavior
    -   feat: preliminary auto-complete Discord interaction
    -   fix: import of DiscordInteraction options
    -   fix: use options.discord, to have that as an override
    -   fix: names in logging
    -   fix: better emoji parsing coverage, using Twemoji
    -   fix: edited partial messages will now run on first-time
    -   fix: interaction match handling

    BREAKING CHANGE: bot permission checks are now async, for more accuracy.

-   Updated dependencies [a244b9b]
    -   @framedjs/shared@0.2.1

## 0.8.0-next.7

### Minor Changes

-   25d14ee: Better Discord interaction helpers and support

### Patch Changes

-   27a57e2: feat: minor edits to logging in CommandManager
-   Updated dependencies [a244b9b]
    -   @framedjs/shared@0.2.1-next.0

## 0.8.0-next.6

### Minor Changes

-   31714f8: Changes:

    -   feat: arguments contain the wrapping quotes
    -   feat: start + end quote characters in Argument
    -   fix: disallow quote char mixes in args parsing

## 0.8.0-next.5

### Patch Changes

-   cbfcce0: fix: slash subcommands types

## 0.8.0-next.4

### Minor Changes

-   eb8c183: Changes:

    -   feat: export all of SlashCommandBuilder
    -   fix: slash subcommands implementation

## 0.8.0-next.3

### Minor Changes

-   f6e644d: Changes:

    -   feat: export ArgumentOptions
    -   fix: deferred interactions for sendErrorMessage
    -   fix: enable subcommands for slash commands
    -   refactor: simplify msg.discordInteraction.interaction

## 0.8.0-next.2

### Minor Changes

-   ce0f4ac: - fix: discord interaction user permission check
    -   refactor: log "/" instead of "slash command"

## 0.8.0-next.1

### Minor Changes

-   a1d30c2: feat: expose @discordjs/rest and builders

## 0.8.0-next.0

### Minor Changes

-   3ba183b: feat: msg.send support Discord interaction replies

## 0.7.2

### Patch Changes

-   ed90ad6: Let's pretend I didn't forget to build

## 0.7.1

### Patch Changes

-   e1f784c: fix: use d.js botRole.toString()

## 0.7.0

### Minor Changes

-   733950f: Discord interactions

## 0.6.1

### Patch Changes

-   b72dd2e: Update deps

## 0.6.0

### Minor Changes

-   3ffdd32: - Discord.js v13 update and update deps
    -   Made auto-initalize option optional

## 0.5.1

### Patch Changes

-   5ca641e: Release 0.5.1

    Bugfixes:

    -   Fixed automatic user permissions to actually get blocked

## 0.5.0

### Minor Changes

-   87a0b69: Release 0.5.0

    Features:

    -   Discord client login options

## 0.4.4

### Patch Changes

-   e0a563e: Release 0.4.4

    Bugfixes:

    -   Don't fetch partials without permission

## 0.4.3

### Patch Changes

-   8dc219c: Release 0.4.3

    Bugfixes:

    -   Emoji parsing on specific emojis (such as 🧇)
    -   Permission error message sending issues

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
