---
"@framedjs/core": patch
---

-   Features:
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
