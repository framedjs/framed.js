---
"@framedjs/core": minor
---

Guild or twitch channel specific prefixes

-   Guild or Twitch channel specific prefixes
-   Twitch message now carries ApiClient

*   Formatting changes

-   Specific prefixes

*   "chatClient" renamed to just "chat"
*   Some command getters and parsers are now async
*   new Message calls need message.getMessageElements() to get prefix,
    command, and args variables set on the Message instance.
*   Removed unused Help interfaces from PluginManager
*   Formatting must be done per each ran command
