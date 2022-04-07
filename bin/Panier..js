const fs = require('fs');
const archiver = require('archiver');


var Panier = {

    getZippedPanier: function (content, response) {
        var archiveName = 'example.zip'
        const output = fs.createWriteStream("/tmp/" + archiveName);
        const archive = archiver('zip', {
            zlib: {level: 9} // Sets the compression level.
        });

        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');

        });


        output.on('end', function () {
            var archive = fs.readFileSync("/tmp/" + archiveName);
            response.setHeader('Content-type', 'application/zip');
            response.setHeader("Content-Disposition", "attachment;filename=" + archiveName);
            response.send(archive);
            console.log('Data has been drained');
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

            archive.file(photoPath, {name: photoPath.replace(/\//g, " | ")});
        })

        archive.finalize();
    }
}
module.exports = Panier



