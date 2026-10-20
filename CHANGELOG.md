# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.6.0]

### Added
- Full-text search across conversations, the same search as the standalone [Recall](https://github.com/obrenoalvim/recall) app: the sidebar search box now also searches what was said in every session (prompts, replies and tool calls), with prefix, typo and accent tolerant matching and highlighted snippets. Matching sessions are listed under "In conversations" and resume with one click.
- Unit tests (`npm test`) for the search index.

## [0.5.4]

### Fixed
- Right Ctrl shortcut never fired while a terminal pane had focus (xterm's hidden input textarea was misread as a typing target, blocking it exactly where it's needed).

## [0.5.3]

### Added
- Right Ctrl shortcut: tap it while a terminal pane is focused to type and run `claude` (adds `--dangerously-skip-permissions` when that setting is on).
