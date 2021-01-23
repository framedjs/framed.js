# @framedjs/core

## 0.2.1

### Patch Changes

-   a7e3bfa: Changed behavior of EmbedHelper to not use process.env.PREFIX, as it was a remnant of old code.

## 0.2.0

### Minor Changes

-   c1b7959: Release v0.2.0

    Features:

    -   Notes entry
    -   Better "Check out:" embed text
        -   Can be set to your own commands, or left blank

    Bug fixes:

    -   Added Discord.js (also Twitch) re-export from Framed. This is to have `new Discord.MessageEmbed()`
        work properly for code outside the framework.

    BREAKING:

    -   Changed TypeORM peer version from 0.2.0 to 0.3.0

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
