---
"@framedjs/core": patch
---

fix!: render edit regression

BREAKING CHANGE: Also skips a get request, if the URL starts with the
data parameter on the URL is there.
