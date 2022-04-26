const fs = require('fs');
const archiver = require('archiver');
var path = require('path')


var Panier = {

    getZippedPanier: function (content, user, response) {
        var archiveName = "selectionPhotos_" + user + "_" + new Date().toJSON().slice(0, 10) + ".zip"
        const output = fs.createWriteStream("/tmp/" + archiveName);
        const archive = archiver('zip', {
            zlib: {level: 9} // Sets the compression level.
        });

        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            var archive2 = fs.readFileSync("/tmp/" + archiveName);
            response.setHeader('Content-type', 'application/zip');
            response.setHeader("Content-Disposition", "attachment;filename=" + archiveName);
            response.send(archive2);
            console.log('Data has been drained');

        });


        output.on('end', function () {

        });

// good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                // log warning
            } else {
                // throw error
                throw err;
            }
        });

// good practice to catch this error explicitly
        archive.on('error', function (err) {
            throw err;
        });

// pipe archive data to the file
        archive.pipe(output);


// append a file from string
        content.forEach(function (photoPath) {
            var absolutePhotoPath = path.join("/var/" + decodeURIComponent(photoPath))
            absolutePhotoPath = path.resolve(absolutePhotoPath)
            console.log(absolutePhotoPath)
            if(!fs.existsSync(absolutePhotoPath)){
                var x=3
            }

            archive.file(absolutePhotoPath, {name: photoPath.replace(/\//g, " | ")});
        })

        archive.finalize();
    }
}
module.exports = Panier



