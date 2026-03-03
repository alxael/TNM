# Purpose

The purpose of this project is to illustrate in a 3D space various chaotic systems in an interactive manner.

## Features

The application is simple, it contains a sidenav menu (that overlays the main section) that has a list of multiple chaotic systems.

Then in the top right corner is a settings modal that has all of the settings for the chaotic systems. In the settings menu you can set the following things:
- Number of iterations through the system
- Path color
- Paths saved in the system

Then, right next to that, you have a list button. The list button pops up and it shows a table containing the paths that are currently drawn on the system. The user can only delete paths in this menu.

In the center of the screen, you have a 3D space that is custom bound for each chaotic system. You can move the 3D plane by dragging the mouse around, allowing him to move the view angle on the 3D space that is in the center of the screen, and then on a simple click, a path is plotted with the given settings.

## Content

The first only system that is currently planned to be implemented is the [folded-towel map](https://en.wikipedia.org/wiki/Hyperchaos#Mathematical_examples).

## Roadmap

1. Implement one map and just the 3D system part.
2. Implement the sound design so that plotting a path on the graph leads to a nice tune.
3. Make an interactive VR scene with the current map.