# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.5.4]

### Fixed
- Right Ctrl shortcut never fired while a terminal pane had focus (xterm's hidden input textarea was misread as a typing target, blocking it exactly where it's needed).

## [0.5.3]

### Added
- Right Ctrl shortcut: tap it while a terminal pane is focused to type and run `claude` (adds `--dangerously-skip-permissions` when that setting is on).
