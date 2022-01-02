
var fs = require('fs');
var path = require('path');
var async = require('async');

//const ThumbnailGenerator = require('video-thumbnail-generator').default;
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

    getDirContent: function (dirPath, options, processorFn, callback) {
        if (!options) {
            options = {}
        }

        var dirsArray = []
        var dirFilesMap = {}
        var rootDirName = path.basename(dirPath)
var totalDirs=0
        function recurse(parent,level) {
            parent = path.normalize(parent);
            if (!fs.existsSync(parent))
                return callback("dir doesnt not exist :" + parent)
            if (parent.charAt(parent.length - 1) != path.sep)
                parent += path.sep;


            var files = fs.readdirSync(parent);

            if(files.length==0)
               ;// return


            async.eachSeries(files,function(file,callbackEach){
           // for (var i = 0; i < files.length; i++) {
                var fileName = parent + file;
                var stats = fs.statSync(fileName);
                var infos = {lastModified: stats.mtimeMs};//fileInfos.getDirInfos(dir);

                if (stats.isDirectory(fileName)) {
                    dirFilesMap[fileName + "/"] = [];
                 //   dirsArray.push({type: "dir", name: files[i], parent: parent})
                    recurse(fileName,level+1)
                } else {

                    var p = fileName.lastIndexOf(".");
                    if (p < 0)
                        return callbackEach()
                    var extension = fileName.substring(p + 1).toLowerCase();
                    if (options.acceptedExtensions && options.acceptedExtensions.indexOf(extension) < 0) {
                        return callbackEach()
                    }
                    if (options.maxDocSize && stats.size > options.maxDocSize) {
                        console.log("!!!!!! " + fileName + " file  too big " + Math.round(stats.size / 1000) + " Ko , not indexed ");
                        return callbackEach()
                    }
                    if (!dirFilesMap[parent])
                        dirFilesMap[parent] = []
                    dirFilesMap[parent].hasJPG = true
                    if((totalDirs++)%10==0)
                        console.log("directories "+totalDirs)
                    if(processorFn){
                        processorFn({parent: parent, name: file})
                        return callbackEach()
                    }else {
                        dirFilesMap[parent].push({type: "file", parent: parent, name: files[i], infos: infos})
                        return callbackEach()
                    }
                    return callbackEach()
                    //  dirsArray.push({type: "file", parent: parent, name: files[i], infos: infos})

                }


            },function(err){
                if(err)
                    console.log(err)
               // return console.log("ALL DONE")
            })

        }

        recurse(dirPath,0);
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

getPhotosIndexList=function(sourceDir,targetDir){



    var buffer=[]
    var bufferSize=100
    var processor=function(photoObj,callback){

        buffer.push(photoObj)
        if(buffer.length>bufferSize){


        }
    }




    ThumbnailManager.getDirContent(sourceDir, {acceptedExtensions: ["jpg"]}, processor,function (err, filesMap) {

    })



}





if(true){
    sourceDir = "/mnt/montageJungle/polytheque/INDEX/"
    targetDir = "/var/miniaturesPhotos/polytheque"
    console.log("sourceDir : "+sourceDir)
    console.log("targetDir : "+targetDir)
    getPhotosIndexList(sourceDir,targetDir)








}





if (false) {// generate thumbnails
    sourceDir = "/var/montageJungle/polytheque/"
    targetDir = "/var/miniaturesPhotos/polytheque"

    sourceDir = "/var/montageJungle/phototheque/FONDS/7000_MOBILISATION_2017"
    targetDir = "/var/miniaturesPhotos/phototheque"

   // var filigranePath = "D:\\ATD_Baillet\\filigrane\\logoseul-transparent.png"
    var filigranePath = "/var/lib/nodejs/souslesensEureka/config/filigranes/logoseul-transparent.png"

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

        console.log("sourceDir : "+sourceDir)
        console.log("targetDir : "+targetDir)


        ThumbnailManager.getDirContent(sourceDir, {acceptedExtensions: ["jpg"]}, null,function (err, filesMap) {
            var count = 0
            console.log(JSON.stringify(filesMap))
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




//ThumbnailManager.create("C:\\Users\\claud\\Pictures\\")