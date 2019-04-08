const express = require("express");

const bbox = require("./bounding-box");
const server = express();
const os = require("os");

process.env.S3_BUCKET = "grommitz-bbox-images";

server.get('/bbox', async (req, res) => {

    let event = {
        queryStringParameters: {
            img: req.query.img,
            top : req.query.top,
            width : req.query.width,
            height: req.query.height,
            left: req.query.left
        }
    };

    const response = await bbox.handler(event, null, console.log);
    res.send(response.location);
});

server.listen(4242, () => {
     console.log("express is up on 4242...");
});


// const response = bbox.handler({
//     queryStringParameters: {
//         img: "https://www.danburymint.co.uk/wp-content/uploads/2017/04/800.IPB_.jpg",
//         top : "100",
//         width : "200",
//         height: "0150",
//         left: "125"
//     }}, null, console.log);

// console.log("response="+response);