# Mixtube

Mixtube is a web application that let you create queues of videos and automatically cross-fades them so that you get a
continuous stream of music. The only compatible video provider for now is YouTube but more will be added.

## Getting started
For now, the only way to try Mixtube is to clone the GitHub repo and visit the index page through a web server.
You will also need your own YouTube Data API key set into the environment variable `MIXTUBE_YOUTUBE_API_KEY`.

You need npm installed on your machine. Then execute:
```
npm install
MIXTUBE_YOUTUBE_API_KEY=<your YouTube data api key> npm run serve
```

The server should be running by now and you can access MixTube at https://localhost:3000
