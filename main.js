const express = require("express");

const server = express();

server.get('/', (req, res) => {
    res.send("hello from express");
});

server.listen(4242, () => {
    console.log("express is up on 4242...");
});