var fs = require('fs');
var path = require('path');
var async = require('async');
const request = require("request");
const elasticRestProxy = require("./elasticRestProxy.");
const socket = require("../routes/socket");
var util = require('./backoffice/util.')
var indexer = require('./backoffice/indexer.')

var PhotosScanner = {


    getDirContent: function (options, callback) {
        if (!options) {
            options = {}
        }
        var dirPath = options.topDir
        var dirPathOffest = dirPath.length + 1
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
                        var obj = {id: parent, files: []}
                        var parentDir = parent.substring(dirPathOffest)
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
        async.eachSeries(dirs1, function (dir1, callbackEach) {
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
                    totalDirsIndexed += result.dirs
                    var duration = Math.round((new Date() - t1) / 1000)
                    console.log("" + index + "/" + dirs1.length + "  processed " + dir1);
                    console.log(" Total  indexed : leaf directories  " + totalDirsIndexed + " ,files " + totalFilesIndexed + " in sec. " + duration)
                    callbackEach();
                })
            }

            else if(options.processor =="correctPhotosPath"){

            }

        }, function (err) {
            console.log(" ALL DONE")
        })
        //  return callback(null, dirFilesMap)
    },


    indexPhotosCatalog: function (photosMap, options, callback) {

        var indexName = "photos-catalog"
        if (options.indexName)
            indexName = options.indexName;


        var sliceSize = 100


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
                var slices = util.sliceArray(elasticObjs, sliceSize)
                async.eachSeries(slices, function (slice, callbackEach) {

                    var bulkStr = ""
                    slice.forEach(function (item) {
                        totalFiles += item.files.length
                        bulkStr += JSON.stringify({index: {_index: indexName, _type: indexName, _id: item.id}}) + "\r\n"
                        bulkStr += JSON.stringify(item) + "\r\n";

                    })


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
                    return callbackSeries(err)
                })
            }], function (err) {
            return callback(err, {dirs: elasticObjs.length, files: totalFiles})
        })


    }


}
module.exports = PhotosScanner


var options = {
    topDir: "/var/montageJungle/Poly",
    processor: "indexPhotosCatalog",
    acceptedExtensions: ["jpg", "JPG", "JPEG", "jpeg", "odt", "ods", "ODT", "ODS"],
    elasticUrl: elasticRestProxy.getElasticUrl(),
    indexName: "photos-catalog-polytheque",
    deleteOldIndex: true


}
if (false) {

    var options = {
        topDir: "/var/miniaturesPhotos/polytheque/",
        processor: "correctPhotosPath",
        acceptedExtensions: ["jpg", "JPG", "JPEG", "jpeg", "odt", "ods", "ODT", "ODS"],
        elasticUrl: elasticRestProxy.getElasticUrl(),
        indexName: "photos-catalog-phototheque",
        deleteOldIndex: true


    }

    PhotosScanner.getDirContent(options, function (err, result) {
        if (err)
            return console.log(err)

        // fs.writeFileSync("/home/claude/poltythequeTest.json",JSON.stringify(result,null,2))
    })
}