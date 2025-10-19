# Yushima-Dev

This is the development version of Yushima user script with experimental fixes and improvements.

## Changes from main version

### Fixed automatic episode marking
- Now checks for maximum episodes before marking next episode as watched
- Prevents auto-marking when episode number exceeds known total episodes for the anime
- Added warning log when trying to mark an episode that exceeds the maximum

### Fixed output window opening issue
- Menu command now checks setting value when executed
- Provides feedback when output window is disabled in settings
- Hides output window when disabled in settings

## Installation

This is a development version for testing purposes. For regular use, please install the main version of Yushima.

To install:
1. Install Tampermonkey or Violentmonkey browser extension
2. Click on the yushima.user.js file in this directory to install the script

## Notes

This development version contains experimental fixes. Stability is not guaranteed. Use at your own risk for testing purposes.