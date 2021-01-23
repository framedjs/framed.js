---
"@framedjs/core": minor
---

Release v0.2.0

Features:

-   Notes entry
-   Better "Check out:" embed text
    -   Can be set to your own commands, or left blank

Bug fixes:

-   Added Discord.js (also Twitch) re-export from Framed. This is to have `new Discord.MessageEmbed()`
    work properly for code outside the framework.

BREAKING:

-   Changed TypeORM peer version from 0.2.0 to 0.3.0
