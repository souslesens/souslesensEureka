var fs = require('fs');
var path = require('path');
var async = require('async');
const request = require("request");
const elasticRestProxy = require("./elasticRestProxy.");
const socket = require("../routes/socket");
var util = require('./backoffice/util.')
var indexer = require('./backoffice/indexer.')
var thumbnailManager = require('./thumbnailManager.')
const Jimp = require("jimp");

var PhotosScanner = {


    getDirContent: function (options, callback) {
        if (!options) {
            options = {}
        }
        var dirPath = options.topDir
        var dirPathOffest = dirPath.length
        //  var dirsArray = []
        var dirFilesMap = {}
        var rootDirName = path.basename(dirPath)
        var totalDirs = 0
        var level1DirsCount = 0

        function recurse(parent, level) {


            parent = path.normalize(parent);
            if (!fs.existsSync(parent))
                return callback("dir doesnt not exist :" + parent)

            var stats = fs.statSync(parent);
            if (!stats.isDirectory(parent)) {
                return
            }
            if (parent.charAt(parent.length - 1) != path.sep)
                parent += path.sep;


            var files = fs.readdirSync(parent);
            for (var i = 0; i < files.length; i++) {
                var fileName = parent + files[i];
                var stats = fs.statSync(fileName);
                var infos = {lastModified: stats.mtimeMs};//fileInfos.getDirInfos(dir);

                if (stats.isDirectory(fileName)) {

                    recurse(fileName, level + 1);
                    if ((totalDirs++) % 200 == 0)
                        console.log("directories " + totalDirs)

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
                    if (!dirFilesMap[parent]) {
                        var parentDir = parent.substring(dirPathOffest)
                        var obj = {id: parentDir, files: []}

                        var parentsArray = parentDir.split('/')
                        for (var j = 0; j < parentsArray.length; j++) {
                            if (parentsArray[j] != "")
                                obj["dir" + (j + 1)] = parentsArray[j]

                        }
                        dirFilesMap[parent] = obj
                    }
                    dirFilesMap[parent].files.push(files[i])


                }
            }
        }


        //recurse each first level dir
        var dirs1 = fs.readdirSync(dirPath);
        var totalFilesIndexed = 0
        var totalDirsIndexed = 0
        var index = 0
        var t1 = new Date()
        var journal=""
        async.eachSeries(dirs1, function (dir1, callbackEach) {
            if(dir1.indexOf("1")!=0)
                return callbackEach()


            recurse(dirPath + "/" + dir1, 0);
            if (Object.keys(dirFilesMap).length == 0)
                return callbackEach()


            if (options.processor == "indexPhotosCatalog") {
                if ((index++) == 0)
                    options.deleteOldIndex = true
                else
                    options.deleteOldIndex = false
                PhotosScanner.indexPhotosCatalog(dirFilesMap, options, function (err, result) {
                    dirFilesMap = {}
                    totalFilesIndexed += result.files;
                    totalDirsIndexed += result.dirs;
                    var duration = Math.round((new Date() - t1) / 1000)
                    var message="" + index + "/" + dirs1.length + "  processed " + dir1;
                    console.log("" + index + "/" + dirs1.length + "  processed " + dir1);
                    journal+=message+"\n"
                    message=" Total  indexed : leaf directories  " + totalDirsIndexed + " ,files " + totalFilesIndexed + " in sec. " + duration
                    journal+=message+"\n"
                    message=" Total  thumbnails  " + result.thumbnails.count + " in sec. " + result.thumbnails.duration
                    journal+=message+"\n"


                    callbackEach();

                })
            }


        }, function (err) {
            var journalPath=options.journalDir+options.indexName+"_"+new Date()+".txt"
            fs.writeFileSync(journalPath,journal)
            console.log(" ALL DONE")
        })
        //  return callback(null, dirFilesMap)
    },


    indexPhotosCatalog: function (photosMap, options, callback) {

        var indexName = "photos-catalog"
        if (options.indexName)
            indexName = options.indexName;


        var sliceSize = 100
      var thumbnailJournal=""
        var t0=new Date()
        var index1=0;
        console.log(Object.keys(photosMap).length)
        var totalFiles = 0
        var elasticObjs = []
        for (var key in photosMap) {
            var photos = photosMap[key];
            elasticObjs.push(photosMap[key])
        }

        async.series([
                function (callbackSeries) {
                    if (!options.deleteOldIndex) {
                        return callbackSeries()
                    }
                    var config = {
                        general: {indexName: options.indexName},
                        indexation: {
                            elasticUrl: options.elasticUrl,
                            deleteOldIndex: options.deleteOldIndex
                        },
                    };

                    indexer.deleteIndex(config, function (err, result) {
                        return callbackSeries(err)
                    })

                },
                function (callbackSeries) {
                    if (false)
                        return callbackSeries();
                    var slices = util.sliceArray(elasticObjs, sliceSize)
                    async.eachSeries(slices, function (slice, callbackEach) {

                        var bulkStr = ""
                        slice.forEach(function (item) {
                            totalFiles += item.files.length
                            bulkStr += JSON.stringify({index: {_index: indexName, _type: indexName, _id: item.id}}) + "\r\n"
                            bulkStr += JSON.stringify(item) + "\r\n";

                        })

                      //  console.log("indexing " + item.id);
                        var requestOptions = {
                            method: 'POST',
                            body: bulkStr,
                            encoding: null,
                            // timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
                            headers: {
                                'content-type': 'application/json'
                            },
                            url: options.elasticUrl + "_bulk?refresh=wait_for"
                        };


                        request(requestOptions, function (error, response, body) {
                            if (error) {
                                return callbackEach(error)

                            }
                            elasticRestProxy.checkBulkQueryResponse(body, function (err, result) {
                                if (err)
                                    return callbackEach(err);
                                callbackEach(error)

                            })
                        })
                    }, function (err) {
                        console.log("indexed " + totalFiles +" jpg files");
                        return callbackSeries(err)
                    })
                },
                //generate thumbnail
                function (callbackSeries) {
                    if (!options.generateThumbnails)
                        return callbackSeries();
                    if(elasticObjs.length==0)
                        return callbackSeries();

                    thumbnailManager.getWaterMarkImage(options.thumbnailParams,function(err,result){
                        if (err)
                            return callbackSeries(err)
                        options.thumbnailParams.watermark.image=result;
                        callbackSeries(err)
                    })

                }
                , function (callbackSeries) {
                    if (!options.generateThumbnails)
                        return callbackSeries();
                    var index1=0;


                    async.eachSeries(elasticObjs, function (item, callbackEach1) {
                        index2=0;

                        if (item.files.length == 0)
                            return callbackEach1();
var t1=new Date()
                        console.log("generating thumbnails for "+ item.id );

                        async.eachSeries(item.files, function (file, callbackEach2) {
                            index1+=1
                            index2+=1
                            var imgPath = item.id + file
                            var thumbnailPath = options.thumbnailParams.targetDir + imgPath.replace(/\//g, "|_|")


                            imgPath = options.topDir + imgPath
                            thumbnailManager.generateThumnail(imgPath, thumbnailPath, options.thumbnailParams, function (err, result) {
                                if (err)
                                    return callbackEach2(err)
                                return callbackEach2()
                            })
                        }, function (err) {
                            var duration=Math.round((new Date()-t1)/1000)
                            var message=" generated thumbnails " + index2+ " in sec. " + duration

                            console.log(message)
                            return callbackEach1()
                        })

                    }, function (err) {

                        return callbackSeries()
                    })


                }


            ],

            function (err) {
               var duration=Math.round((new Date()-t0)/1000)
                return callback(err, {dirs: elasticObjs.length, files: totalFiles,thumbnails:{count:index1,duration:duration}})
            }
        )


    }


}
module.exports = PhotosScanner


if (true
) {

    var options = {
        topDir: "/var/montageJungle/Photo/FONDS/",
        processor: "indexPhotosCatalog",
        acceptedExtensions: ["jpg", "JPG", "JPEG", "jpeg"],// "odt", "ods", "ODT", "ODS"],
        elasticUrl: elasticRestProxy.getElasticUrl(),
        indexName: "photos-catalog-phototheque",
        deleteOldIndex: false


    }
    var options = {
        topDir: "/var/montageJungle/Poly/",
        processor: "indexPhotosCatalog",
        acceptedExtensions: ["jpg", "JPG", "JPEG", "jpeg"],//, "odt", "ods", "ODT", "ODS"],
        elasticUrl: elasticRestProxy.getElasticUrl(),
        indexName: "photos-catalog-polytheque",
        deleteOldIndex: true,
        generateThumbnails: true,
        journalDir:"home/claude/"


    }
    var watermarkPath = path.join(__dirname, "../config/filigranes/logoseul-transparent.png")
    watermarkPath = path.resolve(watermarkPath)


    var thumbnailParams = {
        targetDir: "/var/miniaturesPhotos2/polytheque/",
        width: 480,
        quality: 80,
        acceptedExtensions: ["jpg"],
        watermark: {
             path: watermarkPath,
            'ratio': 0.5,// Should be less than one
            'opacity': 0.20, //Should be less than one
        }
    }
    options.thumbnailParams = thumbnailParams

    PhotosScanner.getDirContent(options, function (err, result) {
        if (err)
            return console.log(err)

        // fs.writeFileSync("/home/claude/poltythequeTest.json",JSON.stringify(result,null,2))
    })
}