const express = require("express");
const bbox = require("./bounding-box");
const server = express();

process.env.S3_BUCKET = "grommitz-bbox-images";

server.get('/bbox', (req, res) => {
    let event = {
        queryStringParameters: {
            img: req.query.img,
            top : req.query.top,
            width : req.query.width,
            height: req.query.height,
            left: req.query.left
        }
    };
    bbox.handler(event, null, (a,b) => { res.send(b) });
});

server.listen(4242, () => {
     console.log("express is up on 4242...");
});
