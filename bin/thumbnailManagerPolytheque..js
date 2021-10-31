//var thumb = require('node-thumbnail').thumb;
var fs = require('fs');
var path = require('path');
var async = require('async');
var watermark = require('jimp-watermark');
var Jimp = require('jimp')


var ThumbnailManagerPolytheque = {


    getDirContent: function (dirPath, options, callback) {
        if (!options) {
            options = {}
        }

        var dirsArray = []
        var dirFilesMap = {}
        var rootDirName = path.basename(dirPath)

        function recurse(parent) {
            parent = path.normalize(parent);
            if (!fs.existsSync(parent))
                return callback("dir doesnt not exist :" + parent)
            if (parent.charAt(parent.length - 1) != path.sep)
                parent += path.sep;


            var files = fs.readdirSync(parent);
            for (var i = 0; i < files.length; i++) {
                var fileName = parent + files[i];
                var stats = fs.statSync(fileName);
                var infos = {lastModified: stats.mtimeMs};//fileInfos.getDirInfos(dir);

                if (stats.isDirectory(fileName)) {
                    dirFilesMap[fileName + path.sep] = [];
                    dirsArray.push({type: "dir", name: files[i], parent: parent})
                    recurse(fileName)
                } else {

                    var p = fileName.lastIndexOf(".");
                    if (p < 0)
                        continue;
                    var extension = fileName.substring(p + 1).toLowerCase();
                    if (options.acceptedExtensions && options.acceptedExtensions.indexOf(extension) < 0) {
                        continue;
                    }
                    if (options.maxDocSize && stats.size > options.maxDocSize) {
                        console.log("!!!!!! " + fileName + " file  too big " + Math.round(stats.size / 1000) + " Ko , not indexed ");
                        continue;
                    }
                    if (!dirFilesMap[parent])
                        dirFilesMap[parent] = []
                    dirFilesMap[parent].hasJPG = true
                    dirFilesMap[parent].push({type: "file", parent: parent, name: files[i], infos: infos})
                    dirsArray.push({type: "file", parent: parent, name: files[i], infos: infos})
                }
            }
        }

        recurse(dirPath);
        return callback(null, dirFilesMap)
    },


    generateThumnail: function (imgPath, thumbnailPath, params, callback) {
        if (!fs.existsSync(imgPath))
            return callback("not exists")

        Jimp.read(imgPath, function (err, image) {
            if (err)
                return callback(err)
            image.resize(params.width, Jimp.AUTO);
            image.quality(params.quality);

            if (params.watermark.image) {
                var w = image.bitmap.width;
                var h = image.bitmap.height;
                var ww = params.watermark.image.bitmap.width;
                var wh = params.watermark.image.bitmap.height;
                var x = (w - ww) / 2
                var y = (h - wh) / 2

                image.composite(params.watermark.image, x, y, [
                    {
                        mode: Jimp.BLEND_SCREEN,
                        //   opacitySource: 1,
                        //   opacityDest: 0.25
                    }
                ]);
                image.write(thumbnailPath);
            } else
                image.write(thumbnailPath);


            return callback();


            image.getBuffer(Jimp.MIME_JPEG, function (err, buffer) {

                fs.open(thumbnailPath, 'w', function (err, fd) {
                    if (err) {
                        throw 'could not open file: ' + err;
                    }
                    fs.write(fd, buffer, 0, buffer.length, null, function (err) {
                        if (err) throw 'error writing file: ' + err;
                        fs.close(fd, function () {
                            console.log('wrote the file successfully');
                        });
                    });
                });
            });

            return callback()
        })
    },


    buidThumbnails: function (sourceDir, targetDir, params, callback) {
        var watermarkImage
        var filesMap
        var thumbnailsCount = 0
        var t0 = new Date()
        async.series([
            function (callbackSeries) {
                // load watermark image
                Jimp.read(params.watermark.path, function (err, image) {
                    if (err)
                        return callbackSeries(err)
                    image.resize(params.width * params.watermark.ratio, Jimp.AUTO);
                    image.opacity(params.watermark.opacity)
                    watermarkImage = image;
                    callbackSeries()
                })

            },
            // get all photos
            function (callbackSeries) {
                ThumbnailManagerPolytheque.getDirContent(sourceDir, {acceptedExtensions: params.acceptedExtensions}, function (err, result) {
                    if (err)
                        return callbackSeries(err)
                    filesMap = result
                    callbackSeries()
                })
            },
            function (callbackSeries) {
                //generate all thumbnails

                async.eachSeries(Object.keys(filesMap), function (dir, callbackDir) {

                    console.log("processing dir :" + dir)
                    var photos = filesMap[dir]

                    async.eachSeries(photos, function (photo, callbackPhoto) {
                        if (!filesMap[dir].hasJPG)
                            return callbackDir();
                        var imgPath = photo.parent + photo.name

                        var subdir = dir.replace(sourceDir, "")
                        var thumbnailPath = targetDir + subdir.replace(/[\\:/]/g, "_") + photo.name
                        params.watermark.image = watermarkImage

                        ThumbnailManagerPolytheque.generateThumnail(imgPath, thumbnailPath, params, function (err, result) {
                            if (err)
                                console.log(err);
                            thumbnailsCount+=1
                            if( thumbnailsCount%5==0)
                                console.log("processed " + thumbnailsCount + " in " + ((new Date() - t0) / 1000) + " sec.")
                            callbackPhoto()

                        })

                    }, function (err) {

                        callbackDir(err)

                    })
                }, function (err) {
                    return callbackSeries(err)
                })


            }


        ], function (err) {
            return callback(err, "DONE total thumbnails :" + thumbnailsCount)
        })


    }
}


var sourceDir = "\\\\Jungle\\jungle\\Poly\\"
var targetDir = "\\\\Jungle\\jungle\\Poly\\INDEX\\"
var watermarkPath = path.join(__dirname, "../config/filigranes/logoseul-transparent.png")
watermarkPath = path.resolve(watermarkPath)

var params = {
    width: 480,
    quality: 80,
    acceptedExtensions: ["jpg"],
    watermark: {
        path: watermarkPath,
        'ratio': 0.5,// Should be less than one
        'opacity': 0.15, //Should be less than one
    }
}

var sourceDir = "C:\\Users\\claud\\Pictures\\test\\";
var targetDir = "D:\\photosThumbnails\\"

var sourceDir = "/var/lib/nodejs/souslesensEureka/public/Photos/polytheque/"
var targetDir = "/var/lib/nodejs/souslesensEureka/public/Photos/INDEXES/polytheque/"
var watermarkPath =    path.join(__dirname, "../config/filigranes/logoseul-transparent.png")
watermarkPath= path.resolve(watermarkPath)

ThumbnailManagerPolytheque.buidThumbnails(sourceDir, targetDir, params, function (err, result) {
    if (err)
        return console.log(err);
    console.log(result)
})