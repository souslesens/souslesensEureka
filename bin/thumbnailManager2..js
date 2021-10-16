
var fs = require('fs');
var path = require('path');
var async = require('async');

const ThumbnailGenerator = require('video-thumbnail-generator').default;
var Jimp = require('jimp')
var watermark = require('jimp-watermark');
var ThumbnailManager = {


// thumb(options, callback);

    create: function (sourcePath, destinationPath, callback) {
        thumb({
            prefix: '',
            suffix: '',
            digest: false,
            source: sourcePath, // could be a filename: dest/path/image.jpg
            destination: destinationPath,
            concurrency: 4,
            width: 500,
            overwrite: true,
            skip: true, //
            ignore: true,
        }, function (files, err, stdout, stderr) {
            callback(err, "done")
        });
    }


    ,

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
                    dirFilesMap[fileName + "\\"] = [];
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

    }

}

function generateThumnail(imgPath, thumbnailPath, params, callback) {
    if (!fs.existsSync(imgPath))
        return callback("not exists")

    Jimp.read(imgPath, function (err, image) {
        if (err)
            return callback(err)
        image.resize(params.width, Jimp.AUTO);
        image.quality(params.quality);
        if ( false && params.mask)
            image.mask(params.mask, 0, 0,)
         /*   image.composite(params.mask, 0, 0, {
                mode: Jimp.BLEND_MULTIPLY,
                opacitySource: 0.5,
                opacityDest: 0.3
            });*/
        image.write(thumbnailPath);

        return callback()
    })
}


sourceDir = "\\\\Jungle\\jungle\\Poly\\1101-AFRique-DelReg-2003_2017"
targetDir = "\\\\Jungle\\jungle\\Poly\\INDEX\\1101-AFRique-DelReg-2003_2017"


var sourceDir = "C:\\Users\\claud\\Pictures\\Menuge2021";
var targetDir = "D:\\photosThumbnails\\"

if (true) {

    var filigranePath = "D:\\ATD_Baillet\\filigrane\\logoseul-transparent.png"
    Jimp.read(filigranePath, function (err, image) {
        var params = {
            width: 480,
            quality: 80,
            mask: image
        }
        if (err)
            return callback(err)
        image.resize(params.width, Jimp.AUTO);
      //  image.quality(params.quality);
      //  image.opacity(0.2);


        ThumbnailManager.getDirContent(sourceDir, {acceptedExtensions: ["jpg"]}, function (err, filesMap) {
            var count = 0
            async.eachSeries(Object.keys(filesMap), function (dir, callbackDir) {

                console.log("processing ")
                var photos = filesMap[dir]


                async.eachSeries(photos, function (photo, callbackPhoto) {
                    if (!filesMap[dir].hasJPG)
                        return callbackDir();


                    imgPath = photo.parent + photo.name
                    //   var regex=new RegExp("'"+path.sep+"'","g")
                    thumbnailPath = targetDir + dir.replace(/[\\:]/g, "_") + photo.name
                    generateThumnail(imgPath, thumbnailPath, params, function (err, result) {
                        if (err)
                            console.log(err);

                        var watermark = require('jimp-watermark');
                        var options = {
                            'ratio': 0.5,// Should be less than one
                            'opacity': 0.4, //Should be less than one
                            'dstPath' : thumbnailPath.replace(".","_F.")
                        };
                        watermark.addWatermark(thumbnailPath,filigranePath, options);

                        if ((count++) % 10 == 0)
                            console.log(count)
                        callbackPhoto()
                    })
                    /*  ThumbnailManager.create(path, targetDir, function (err, result) {
                          if (err)
                              return callbackPhoto()
                          if ((count++) % 10 == 0)
                              console.log(count)
                          callbackDir()
                      })*/
                }, function (err) {
                    callbackDir(err)

                })
            }, function (err) {
                if (err)
                    return console.log(err)
                return "DONE"
            })

        })
    })
}

if( false){
    process.env['ffmpeg'] = 'D:\\apps\\ffmpeg\\bin\\ffmpeg.exe';
    process.env['FFPROBE_PATH'] = 'D:\\apps\\ffmpeg\\bin\\ffprobe.exe';

    const thumbsupply = require('thumbsupply')
  var  sourcePath='C:\\Users\\claud\\Pictures\\VID_20210712_212355.mp4';
    thumbsupply.generateThumbnail(sourcePath)
        .then(thumb => {
            // serve thumbnail
        })
}

if (false) {

//var  ThumbnailGenerator = require('video-thumbnail-generator');

    const tg = new ThumbnailGenerator({
        sourcePath: 'C:\\Users\\claud\\Pictures\\VID_20210712_212355.mp4',
        thumbnailPath: "D:\\photosThumbnails\\test.gif",
        // tmpDir: '/some/writeable/directory' //only required if you can't write to /tmp/ and you need to generate gifs
    });

    tg.generate()
        .then(console.log);
    // [ 'test-thumbnail-320x240-0001.png',
    //  'test-thumbnail-320x240-0002.png',
    //  'test-thumbnail-320x240-0003.png',
    //  'test-thumbnail-320x240-0004.png',
    //  'test-thumbnail-320x240-0005.png',
    //  'test-thumbnail-320x240-0006.png',
    //  'test-thumbnail-320x240-0007.png',
    //  'test-thumbnail-320x240-0008.png',
    //  'test-thumbnail-320x240-0009.png',
    //  'test-thumbnail-320x240-0010.png' ]

    tg.generateOneByPercent(90)
        .then(console.log);
    // 'test-thumbnail-320x240-0001.png'

    tg.generateCb((err, result) => {
        console.log(result);
        // [ 'test-thumbnail-320x240-0001.png',
        //  'test-thumbnail-320x240-0002.png',
        //  'test-thumbnail-320x240-0003.png',
        //  'test-thumbnail-320x240-0004.png',
        //  'test-thumbnail-320x240-0005.png',
        //  'test-thumbnail-320x240-0006.png',
        //  'test-thumbnail-320x240-0007.png',
        //  'test-thumbnail-320x240-0008.png',
        //  'test-thumbnail-320x240-0009.png',
        //  'test-thumbnail-320x240-0010.png' ]
    });

    tg.generateOneByPercentCb(90, (err, result) => {
        console.log(result);
        // 'test-thumbnail-320x240-0001.png'
    });

    tg.generateGif()
        .then(console.log());
    // '/full/path/to/video-1493133602092.gif'

    tg.generateGifCb((err, result) => {
        console.log(result);
        // '/full/path/to/video-1493133602092.gif'
    })
}


var imgPath = "C:\\Users\\claud\\Pictures\\IMG_20210716_154119.jpg";
var thumbnailPath = "C:\\Users\\claud\\Pictures\\INDEX\\test1.jpg"


//ThumbnailManager.create("C:\\Users\\claud\\Pictures\\")