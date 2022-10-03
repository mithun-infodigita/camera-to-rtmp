import path from 'path'
import http from 'http'
import express from 'express'
import {Server} from 'socket.io'
import dotenv from 'dotenv'

import Ffmpeg from './utils/ffmpeg.js'

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
    }
});


const port = process.env.PORT || 3000;

let ffmpegProcess = null;

io.on("connection", socket => {
  console.log("New WebSocket connection");


    socket.on("start", (event, callback) => {
        console.log('start streaming')
        const options = {
            framerate: event.framerate,
            audioSampleRate: event.audioSampleRate,
            rtmp: event.rtmp,
        }
        ffmpegProcess = new Ffmpeg(options);


        ffmpegProcess.on("destroyed", () => ffmpegProcess = undefined);
        ffmpegProcess.on('ffmpegOutput', (e) => socket.emit('ffmpegOutput', e));
        // this.ffmpeg.on('error', (e: ServerError) => this.onFfmpegError(e));
        ffmpegProcess.start();

        if (callback) callback();
    });
    socket.on("stop", (callback) => {
        console.log('stop streaming')
        ffmpegProcess?.destroy();
    });
    socket.on("error", (event) => {
        console.log('error')
    });

    socket.on("binarystream", (binaryData, callback) => {
        ffmpegProcess?.sendData(binaryData)
        .then(() => callback())
        .catch((err) => {
            console.log('sending error')
            console.log(err)
            socket.emit("error", err);
            callback(err);
        });
    });

});


server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});
