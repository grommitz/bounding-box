// Used to access the image passed in the link 
// See: https://github.com/request/request
const request = require('request');

// Used to manipulate the image and add bounding boxes
// See: https://github.com/lovell/sharp
const sharp = require('sharp');

// Used to store the new image with bounding boxes on AWS S3
// See https://github.com/aws/aws-sdk-js
const AWS = require('aws-sdk');
const S3 = new AWS.S3({signatureVersion: 'v4'});

// Used to generate file names for the new images we create
const crypto = require('crypto');

exports.handler = (event, context, callback) => {
    // Grab the URL of the source image from the img parameter
    const img = event.queryStringParameters.img;

    // Grab the top, left, width and height parameters for each bounding box
    // These are each arrays to allow for multiple bounding boxes
    const top = event.queryStringParameters.top.split(',');
    const left = event.queryStringParameters.left.split(',');
    const width = event.queryStringParameters.width.split(',');
    const height = event.queryStringParameters.height.split(',');
    
    // We will generate an array of SVG rectangles
    let svgRectangles =[];

    for(let i = 0; i < top.length; i++){
        // Generate a new random hex color for each bounding box
        let boxColor = '#' + Math.floor(Math.random()*16777215).toString(16); // Will be something like #FF9900 
        
        // For each bounding box, we generate an SVG rectangle as described here: 
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Element/rect
        // Using the top, left, width and height arrays we grabbed earlier        
        svgRectangles.push (` <rect height="`+height[i]+`" width="`+width[i]+`" x="`+left[i]+`" y="`+top[i]+`"
        style="fill: none; stroke: `+boxColor+`; stroke-width: 5"/>`)
    }

    // Now grab the image from the URL that was sent in
    let requestSettings = {
        method: 'GET',
        url: img,
        encoding: null
    };

    request.get(requestSettings, function (error, response, imageContent) {
        // Load the content of the image file into a Sharp object
        // Then use the height and width of the image from the file metadata to construct an SVG parent element
        // We will then attach the concatenated array of bounding box SVG rectangles we created earlier to the element
        let image = sharp(imageContent);
        image
          .metadata()
          .then(function(metadata) {              
              let svgElement = `<svg height="`+metadata.height+`" width="`+metadata.width+`" viewbox="0 0 `+metadata.width+` `+metadata.height+`" xmlns="http://www.w3.org/2000/svg">`;
              svgElement += svgRectangles.join();
              svgElement += `</svg>`;
            
              // The SVG string we have crafted above needs to be converted into a Buffer object
              // so that we can use Sharp to overlay it with our image buffer
              const svgElementBuffer = new Buffer(svgElement);
              
              const s3Bucket = process.env.S3_BUCKET; // Create an environment variable in Lambda called S3_BUCKET 
              const s3Folder = 'rendered' // We will use this folder to store the rendered images

              // Create a random file name for the rendered image file we will create
              // Note we are assuming all images being passed in are JPEGs to keep things simple
              const hash = String(crypto.createHmac('sha256', 'abcdefg').update(String(Math.random())).digest('hex')) + '.jpg';
                      
              const s3FileLocation = s3Folder + '/' + hash;
              const s3FileURL = 'https://' + s3Bucket + '.s3.amazonaws.com/' + s3FileLocation 
              
              // Now we create a new image buffer combining the original image buffer with the buffer we generated
              // with our SVG bounding box rectangles
              image.overlayWith(svgElementBuffer, {top:0, left:0}).toBuffer().then(updatedBuffer => S3.putObject({
                Body: updatedBuffer,
                Bucket: s3Bucket,
                Key: s3FileLocation,
                ContentType:'image/jpeg',
                ACL: 'public-read'
              }).promise()).then(
                () => callback(null, {
                    // The new file has been successfully created
                    // Return a HTTP 302 code that will automatically redirect the browser to the rendered image
                    // Note you can also make this return a 301 which will permanently redirect the browser after
                    // The first time the function is called with an image and a particular set of bounding box
                    // parameters
                    statusCode: '302',
                    headers: {'location': s3FileURL},
                    body: JSON.stringify(event.queryStringParameters)
                  })        
                )              

          })
    });

};