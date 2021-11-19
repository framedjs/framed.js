---
"@framedjs/core": patch
---

Changes:

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
