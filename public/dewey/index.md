---
title: "Dewey"
subtitle: "the one in blue"
author: "author name"
date: 2026-10-18
description: "Notes on Dewey Duck, the middle nephew"
---

[back to the index](../)

Dewey is the middle name in "Huey, Dewey, and Louie", and that is about the
only thing that sets him apart in older stories. Later versions gave him
more to work with.

## The showman

The 2017 *DuckTales* series cast Dewey as the attention-seeker of the trio:
the one who wants to be on the adventure, preferably at the front of it,
preferably with an audience. That series also gave the nephews distinct
outfits, so telling them apart no longer depended on cap color alone.

## Telling them apart

Before the colors were settled, readers had little to go on. A rough
decision procedure, written as code:

```js
function whichNephew(duck) {
  switch (duck.capColor) {
    case "red": return "Huey"
    case "blue": return "Dewey"
    case "green": return "Louie"
    default: return "ask Donald"
  }
}
```

Even Donald doesn't always get it right.

## Things a Junior Woodchuck should know

The Guidebook covers a lot. A partial list of skills the nephews put to use
over the years:

1. Knot tying
2. Map reading and celestial navigation
3. Identifying edible plants
4. Translating dead languages, as the plot demands
5. Rescuing an uncle from his own temper

## See also

- [Hughie](../hughie/), the planner
- [Louie](../louie/), the schemer
