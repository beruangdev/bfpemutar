'use strict'

const PORT = 3000;
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const nodeCache = require('node-cache');
const CACHE = new nodeCache();
const fetch = require('node-fetch');
const qs = require('querystring');

const path = require('path');
const cors = require('cors');


const cluster = require("cluster")
const os = require("os")

if (cluster.isMaster) {
    for (var i = 0; i < os.cpus().length; i++) {
        var worker = cluster.fork()
    }

    cluster.on(
        "exit",
        function handleExit(worker, code, signal) {
            console.log("[Cluster] Worker end: %s", worker.process.pid);
            console.log("[Cluster] Dead: %s", worker.exitedAfterDisconnect);

            if (!worker.exitedAfterDisconnect)
                var worker = cluster.fork();
        }
    );
} else {
    const app = express();
    app.use(cors());
    app.use(express.static(path.join(__dirname, 'public')))
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: false
    }));
    app.options('*', (req, res, next) => res.end());
    // const router = express.Router()
    app.get('/', (req, res) => res.send('[Free] Proxy Stream Drive'));
    app.get('/sources', get_video_infos);
    app.get('/videoplayback', videoplayback);
    app.listen(PORT, () => console.log('Run app port: %s', PORT));
    console.log("[Worker] Worker start: %s", process.pid);
}



async function get_video_infos(req, res) {
    var fileId = req.query.fileId || null;
    if (!fileId) return res.end('Vui long them query ?fileId={drive-id}');

    var loadCache = CACHE.get(fileId);
    if (loadCache) return res.json(loadCache);

    var datas = await getLink(fileId);
    if (!datas) return res.end('Get link that bai');

    var result = [];
    var domain = req.protocol + '://' + req.get('host');
    var cookie = new Buffer.from(JSON.stringify(datas.cookie)).toString('base64');

    var sources = datas.sources;
    for (let i = 0; i < sources.length; i++) {

        var label = sources[i].label;
        var urnEnc = new Buffer.from(sources[i].file).toString('base64');
        var file = domain + '/videoplayback?url=' + urnEnc + '&cookie=' + cookie;

        result.push({ file, label, type: 'mp4' });
    }

    CACHE.set(fileId, result, 60 * 60 * 6);// Cache 6h

    return res.json(result);
}

async function videoplayback(req, res) {
    // console.log(`Start Playback`);
    var url = req.query.url || null;
    var cookie = req.query.cookie || null;
    if (!url || !cookie) return res.end();

    url = new Buffer.from(url, 'base64').toString('ascii');
    cookie = JSON.parse(new Buffer.from(cookie, 'base64').toString('ascii'));

    if (!url || !cookie) return res.end();

    const headers = Object.assign(req.headers, { cookie });

    delete headers.host;
    delete headers.referer;

    var stream = request({ url, headers });

    stream.on('response', resp => {
        res.statusCode = resp.statusCode;
        Object.keys(resp.headers).forEach(key => {
            res.setHeader(key, resp.headers[key])
        });
    });

    stream.pipe(res);

    res.on('close', () => {
        stream.abort();
    });
}

async function getLink(fileId) {
    return new Promise(async resolve => {
        request('https://drive.google.com/get_video_info?docid=' + fileId, (err, resp, body) => {
            if (err || !resp || resp.statusCode != 200 || !body) {
                return resolve(null);
            }

            var result = {
                cookie: resp.headers['set-cookie']
            };

            var query = qs.parse(body);
            if (query.status !== 'ok') {
                return resolve(null);
            }

            result.sources = query.fmt_stream_map
                .split(',')
                .map(itagAndUrl => {
                    const [itag, url] = itagAndUrl.split('|')
                    return {
                        label: getVideoResolution(itag),
                        file: url
                    }
                })
                .filter(video => video.label !== 0);

            if (!result.sources.length) {
                console.log(`result.sources.length ${result.sources.length}`);
                return resolve(null);
            }

            return resolve(result);
        })
    })
}

function getVideoResolution(itag) {
    const videoCode = {
        '18': '360p',
        '59': '480p',
        '22': '720p',
        '37': '1080p'
    };

    return videoCode[itag] || 0;
}