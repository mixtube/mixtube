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

## Building in details

The Mixtube project is split between the directories `app` and `build`. `app` contains only app specific sources and `build`
only build specific sources. You don't have to think about that too much since the root of the project contains NPM scripts
to help building MixTube for different scenarios.

The low level build command is `gulp-build`. By default it will make a production ready build available
in the `build/public` directory:
```
npm run gulp-build -- [--watch] [--serve] [--baseUrl <string>]
```

You can provides different arguments to turn on / off certain behaviours:

- **watch** watches for source changes and automatically rebuild (`boolean`, `false` by default)
- **serve** turns on the local server (`boolean`, `false` by default)
- **production** turns on minification and inlining of "critical path css" (`boolean`, `true` by default)
- **baseUrl** specifies the base URL to use for all relative URLs (`string`, `/` by default)
- **errorTrackerPath** overrides the default error tracker implementation (`string`)
- **analyticsTrackerPath** overrides the default analytics tracker implementation (`string`)

You can always get the descriptions of the build options by invoking:

```
npm run help
```
