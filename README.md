# Mixtube

Mixtube is a web application that let you create queues of videos and automatically cross-fades them so that you get a
continuous stream of music. The only compatible video provider for now is YouTube but more will be added.

## Getting started
For now, the only way to try Mixtube is to clone the GitHub repo and visit the index page through a web server.
You will also need your own YouTube Data API key set into the environment variable `MIXTUBE_YOUTUBE_API_KEY`.

You need npm installed on your machine. Then execute:
```
npm install
MIXTUBE_YOUTUBE_API_KEY=<your YouTube data api key> npm start
```

The server should be running by now and you can access MixTube at https://localhost:3000

## Building

### Basics

The Mixtube project is split between the directories `app` and `build`. The `app` directory contains only app specific
sources and `build` only build specific sources. You don't have to think about that too much since the root of the
project contains NPM scripts to help getting started with MixTube for different scenarios:
- `npm run debug` is an alias of `npm start` (more precisely, the other way around)
- `deploy:gh` makes a production build and deploys it to the repository `origin`'s GitHub page.It assumes the
repository is named `mixtube`

### Advanced

If you want to build with a better control over the settings the best is to invoke the gulp script directly:

```
cd build
node_modules/.bin/gulp [--watch] [--serve] [--baseUrl <string>]
```

You can provides different arguments to turn on / off certain behaviours:

- **watch** watches for source changes and automatically rebuild (`boolean`, `false` by default)
- **serve** turns on the local server (`boolean`, `false` by default)
- **production** turns on minification and inlining of "critical path css" (`boolean`, `false` by default)
- **publicDirPath** specifies the output directory for the build (`string`, `public` by default)
- **baseUrl** specifies the base URL to use for all relative URLs (`string`, `/` by default)
- **errorsTrackerPath** overrides the default error tracker implementation (`string`). A console logging implementation
will be use if the argument is not defined
- **analyticsTrackerPath** overrides the default analytics tracker implementation (`string`). A noop default
implementation will be use if the argument is not defined

You can always get the descriptions of the build options by invoking:

```
node_modules/.bin/gulp help
```
