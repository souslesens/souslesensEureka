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
        var dirPath = options.photosDir
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

                    if (options.filterDirs && options.filterDirs["" + level + 1]) {
                        var p = i
                        if (p < options.filterDirs["" + level].start || p > options.filterDirs["" + level].end)
                            return

                    }


                    recurse(fileName, level + 1);
                    if ((totalDirs++) % 200 == 0)
                        ;//  console.log("directories " + totalDirs)

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
        var dirsDone=""
        var t1 = new Date()

        var i = -1;
        var journal = ""+new Date()+"\n"
        PhotosScanner.writeJournal(options.journalFilePath,journal,true)
        async.eachSeries(dirs1, function (dir1, callbackEach) {
            i++;
            if (options.filterDirs && options.filterDirs["0"]) {

                var p = i;
                if (p < options.filterDirs["0"].fromDirIndex || p > options.filterDirs["0"].toDirIndex)
                    return callbackEach();

            }

            recurse(dirPath + "/" + dir1, 0);
            if (Object.keys(dirFilesMap).length == 0)
                return callbackEach()

            if (options.processor == "generateThumbnails") {

                PhotosScanner.generateThumbnails(dirFilesMap, options, function (err, result) {
                    dirFilesMap = {}
                    totalFilesIndexed += result.files;
                    totalDirsIndexed += result.dirs;
                    var duration = Math.round((new Date() - t1) / 1000)
                    var message = "" + index + "/" + dirs1.length + "  processed " + dir1;

                    journal += message + "\n"
                    message = " Total  thumbnails  " + result.thumbnails.count + " in sec. " + result.thumbnails.duration
                    journal += message + "\n"
                    PhotosScanner.writeJournal(options.journalFilePath,journal)
                    console.log(message);


                    callbackEach();

                })
            } else if (options.processor == "indexPhotosCatalog") {
                if ((index++) == 0) {
                    options.deleteOldIndex = true
                    var  message =  "dir\ttotalDirsIndexed\tfiles\telasticDocs\tduration sec. \n"
                    PhotosScanner.writeJournal(options.journalFilePath,message)

                }else
                    options.deleteOldIndex = false
                PhotosScanner.indexPhotosCatalog(dirFilesMap, options, function (err, result) {
                    dirFilesMap = {}
                    totalFilesIndexed += result.files;
                    totalDirsIndexed += result.dirs;

                  var  message =  dir1+"\t"+result.dirs+"\t"+result.files +"\t"+  result.elasticDocs+"\t"+ result.duration+"\n"

                        PhotosScanner.writeJournal(options.journalFilePath,message)
                        journal = ""
                    if(index%10==0)
                         console.log(totalFilesIndexed+" files  in  dirs  "+totalDirsIndexed);
                    callbackEach();

                })
            } else if (options.processor == "synchronizeThumbnails") {
                PhotosScanner.synchronizeThumbnails(dirFilesMap, options, function (err, result) {
                    if (err)
                        return callbackEach(err)
                    if ((index++) == 0) {
                        var header = "dir\ttotalPhotosFond\tdirsFonds\tmissingIndexDirs\tmissingIndexPhotos\tsupppressIndexPhotos\n"
                    }
                    journal += dir1 + "\t" + result
                    dirFilesMap = {}


                        PhotosScanner.writeJournal(options.journalFilePath,journal)
                        journal = ""
                    dirsDone+=dir1+", "
                    if (i % 10 == 0) {
                        console.log(dirsDone+ "  "+i)
                    }

                    return callbackEach()

                })

            }

        }, function (err) {
            var journalPath = options.journalDir + options.indexName + "_" + new Date() + ".txt"
            PhotosScanner.writeJournal(journalPath, journal)
            console.log(" ALL DONE")
        })
        //  return callback(null, dirFilesMap)
    },

    writeJournal: function (filePath, message, init) {
        if (init) {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
            fs.writeFileSync(filePath, message)
        } else {
            fs.appendFileSync(filePath,message)
        }
    },


    synchronizeThumbnails: function (photosMap, options, callback) {
        //  console.log(Object.keys(photosMap).length)
        var totalFiles = 0
        var elasticObjs = []


        var infos = ""
        var photosFonds = 0
        var dirsFonds = 0
        var missingIndexDirs = 0
        var missingIndexPhotos = 0
        var supppressIndexPhotos = 0
        for (var key in photosMap) {
            dirsFonds += 1
            var filesFonds = fs.readdirSync(key)
            photosFonds += filesFonds.length
            var indexDirPath =options.targetDir;// key.replace("FONDS", "INDEX")
            if (fs.existsSync(indexDirPath)) {
                var filesIndex = fs.readdirSync(indexDirPath)
                var delta = filesFonds.length - filesIndex.length
                if (delta > 0)
                    missingIndexPhotos += 1
                if (delta < 0)
                    supppressIndexPhotos
            } else {
                missingIndexDirs += 1
            }

        }
        var infos = photosFonds + "\t" + dirsFonds + "\t" + missingIndexDirs + "\t" + missingIndexPhotos + "\t" + supppressIndexPhotos + "\n"
        return callback(null, infos);
        for (var key in photosMap) {
            var photos = photosMap[key];
            elasticObjs.push(photosMap[key])
        }
        var slices = util.sliceArray(elasticObjs, 100)
        var allResults = []
        var totalMiniaturesAdded = 0
        var totalMiniaturesOK = 0
        async.eachSeries(slices, function (slice, callbackEach) {
            var bulQueryStr = "";
            var allPhotoPaths = []
            var photosToIndex = []

            async.series([
                //search missing photos in elastic
                function (callbackSeries) {
                    slice.forEach(function (obj) {
                        if (!obj)
                            return;

                        var array = obj.id.split("/")
                        var mustArray = []
                        array.forEach(function (item, index) {
                            if (item) {
                                mustArray.push({
                                    "term": {
                                        ["dir" + (index + 1) + ".keyword"]: item
                                    }
                                })
                            }
                        })


                        var header = {index: options.indexName}


                        obj.files.forEach(function (photo) {
                            allPhotoPaths.push(obj.id + photo)
                            var queryPhoto = {
                                "query": {
                                    "bool": {
                                        "must": mustArray
                                    }
                                }
                            }


                            queryPhoto.query.bool.must.push({
                                "match": {
                                    "files.keyword": photo
                                }
                            })

                            var queryStr = JSON.stringify(header) + "\r\n" + JSON.stringify(queryPhoto) + "\r\n";

                            bulQueryStr += queryStr;
                        })
                    })

                    elasticRestProxy.executeMsearch(bulQueryStr, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        var x = result
                        result.forEach(function (item, index) {
                            if (item.hits.total == 0) {
                                photosToIndex.push(allPhotoPaths[index])
                            } else {
                                totalMiniaturesOK += 1

                            }
                        })
                        callbackSeries()
                    })
                },

                //indexMissingPhotos
                function (callbackSeries) {
                    totalMiniaturesAdded += photosToIndex.length
                    if (photosToIndex.length == 0) {
                        return callbackSeries()
                    }
                    return callbackSeries()
                    photosToIndex.forEach(function (path) {


                    })
                    return callbackSeries()
                    var bulkStr = ""
                    slice.forEach(function (item) {
                        totalFiles += item.files.length
                        bulkStr += JSON.stringify({
                            index: {
                                _index: indexName,
                                _type: indexName,
                                _id: item.id
                            }
                        }) + "\r\n"
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
                            callbackSeries(error)

                        })
                    })
                }
            ], function (err) {
                return callbackEach(err)
            })

        }, function (err) {
            callback(err, {added: totalMiniaturesAdded, ok: totalMiniaturesOK})
        })
    },


    generateThumbnails: function (photosMap, options, callback) {

        var sliceSize = 100
        var thumbnailJournal = ""
        var t0 = new Date()
        var index1 = 0;
        //  console.log(Object.keys(photosMap).length)
        var totalFiles = 0
        var elasticObjs = []
        for (var key in photosMap) {
            var photos = photosMap[key];
            elasticObjs.push(photosMap[key])
        }

        async.series([
                //generate thumbnail
                function (callbackSeries) {

                    if (elasticObjs.length == 0)
                        return callbackSeries();

                    thumbnailManager.getWaterMarkImage(options.thumbnailParams, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        options.thumbnailParams.watermark.image = result;
                        callbackSeries(err)
                    })

                }
                , function (callbackSeries) {
                    var index1 = 0;


                    async.eachSeries(elasticObjs, function (item, callbackEach1) {
                        var index2 = 0;

                        if (item.files.length == 0)
                            return callbackEach1();
                        var t1 = new Date()


                        console.log("generating thumbnails for " + item.id);

                        async.eachSeries(item.files, function (file, callbackEach2) {
                            index1 += 1
                            index2 += 1
                            var imgPath = options.photosDir+item.id + file
                            var thumbnailPath = options.thumbnailsDir+ item.id + file.replace(/\//g, "|_|")


                           // imgPath = options.topDir + imgPath
                            thumbnailManager.generateThumnail(imgPath, thumbnailPath, options.thumbnailParams, function (err, result) {
                                if (err)
                                    return callbackEach2(err)
                                return callbackEach2()
                            })
                        }, function (err) {
                            var message="";
                            var duration = Math.round((new Date() - t1) / 1000)
                            if(err)
                                message=err
                            else
                               message = " generated thumbnails " + index2 + " in sec. " + duration

                            console.log(message)
                            return callbackEach1()
                        })

                    }, function (err) {

                        return callbackSeries()
                    })


                }


            ],

            function (err) {
                var duration = Math.round((new Date() - t0) / 1000)
                return callback(err, {
                    dirs: elasticObjs.length,
                    files: totalFiles,
                    thumbnails: {count: index1, duration: duration}
                })
            }
        )


    },

    indexPhotosCatalog: function (photosMap, options, callback) {

        var indexName = "photos-catalog"
        if (options.indexName)
            indexName = options.indexName;


        var sliceSize = 100
        var thumbnailJournal = ""
        var t0 = new Date()
        var index1 = 0;
     //   console.log(Object.keys(photosMap).length)
        var totalFiles = 0
        var elasticObjs = []
        var elasticDocs=0
        for (var key in photosMap) {
            var photos = photosMap[key];
            elasticObjs.push(photosMap[key])
        }

        async.series([
                //delete index
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
                    console.log(" deleting index " + options.indexName)
                    indexer.deleteIndex(config, function (err, result) {
                        return callbackSeries(err)
                    })

                },
                //set mappings
                function (callbackSeries) {
                    if (!options.deleteOldIndex) {
                        return callbackSeries()
                    }
                    var properties = {}
                    for (var i = 1; i < 10; i++) {
                        properties["dir" + i] = {
                            type: "text",
                        }

                        properties["num_dir" + i] = {
                            type: "keyword",
                            ignore_above: 256,
                            }


                    }

                    properties.files = {
                        type: "text",

                    }

                    var mappings = {
                        mappings: {
                            [options.indexName]: {
                                properties: properties
                            }
                        }
                    }
                    var optionsMapping = {
                        method: "PUT",
                        json: mappings,
                        encoding: null,
                        timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
                        headers: {
                            "content-type": "application/json",
                        },
                        url: elasticRestProxy.getElasticUrl() + options.indexName,
                    };
                    console.log(" creating mappings for index " + options.indexName)
                    request(optionsMapping, function (error, response, body) {
                        if (error) {
                            return callbackSeries(error);
                        }
                        return callbackSeries();
                    });
                },

                function (callbackSeries) {

                    var slices = util.sliceArray(elasticObjs, sliceSize)
                    var totalIndexed=0

                    async.eachSeries(slices, function (slice, callbackEach) {



                        var bulkStr = ""
                        var regex=/(?<num>[0-9]+)/
                        slice.forEach(function (item) {
                            totalFiles += item.files.length

                            for(var i=1;i<7;i++) {
                                if (item["dir" + i]) {
                                    var array = regex.exec(item["dir" + i])
                                    if (array && array.groups.num)
                                        item["num_dir" + i] = array.groups.num
                                }
                            }
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
                                elasticDocs+=result
                            //    console.log("  indexed " + (totalIndexed++) + "in current top dir")
                                callbackEach(null,result)

                            })
                        })
                    }, function (err) {
                        if( err)
                            return callbackSeries(err)
                      //  console.log("indexed " + totalFiles + " jpg files");
                        return callbackSeries(err)
                    })
                },


            ],

            function (err) {
                var duration = Math.round((new Date() - t0) / 1000)
                return callback(err, {
                    dirs: elasticObjs.length,
                    files: totalFiles,
                    elasticDocs: elasticDocs,
                    duration:duration

                })
            }
        )


    },


    processDirs: function (theque, processing, fromDirIndex, toDirIndex) {

        var _options = {
            acceptedExtensions: ["jpg", "JPG", "JPEG", "jpeg"],//, "odt", "ods", "ODT", "ODS"],
            elasticUrl: elasticRestProxy.getElasticUrl(),
            journalDir: "/home/claude/"

        }

        var watermarkPath = path.join(__dirname, "../config/filigranes/logoseul-transparent.png")
        watermarkPath = path.resolve(watermarkPath)
        var thumbnailParams = {
            targetDir: "/var/miniaturesPhotos2/artotheque/",
            width: 480,
            quality: 80,
            acceptedExtensions: ["jpg"],
            watermark: {
                path: watermarkPath,
                'ratio': 0.5,// Should be less than one
                'opacity': 0.20, //Should be less than one
            }
        }
        _options.thumbnailParams = thumbnailParams

        var params = {
            paths: {
                phototheque: {
                    photosDir: "/var/montageJungle/Photo/FONDS/",
                    thumbnailsDir: "/var/montageJungle/MiniaturesPhotos/phototheque/",
                    indexName: "photos-catalog-phototheque",
                }
                ,
                polytheque: {
                    photosDir: "/var/montageJungle/Poly/",
                    thumbnailsDir: "/var/montageJungle/MiniaturesPhotos/polytheque/",
                    indexName: "photos-catalog-polytheque",
                }
                ,
                artotheque: {
                    photosDir: "/var/montageJungle/Arto/FONDS/",
                    thumbnailsDir: "/var/montageJungle/MiniaturesPhotos/artotheque/",
                    indexName: "photos-catalog-artotheque",
                }
            },
            processing: {
                indexPhotosCatalog: {
                    processor: "indexPhotosCatalog",
                    deleteOldIndex: true,
                },
                generateThumbnails: {
                    processor: "generateThumbnails",

                },
                synchronizeThumbnails: {
                    processor: "synchronizeThumbnails"
                }

            }

        }
        _options = Object.assign(_options, params.paths[theque], params.processing[processing])


        if (fromDirIndex && toDirIndex) {
            _options.filterDirs = {
                "0": {start: parseInt(fromDirIndex), end: parseInt(toDirIndex)},
            }
        }

     //   _options.journalFilePath = "~/" + processing + "_" + theque + ".csv"
        _options.journalFilePath = "/home/claude/" + processing + "_" + theque + ".csv"

        PhotosScanner.getDirContent(_options, function (err, result) {
            if (err)
                return console.log(err)


        })
    }

}

module.exports = PhotosScanner

var theque = "phototheque"
var processing = "generateThumbnails"
//var processing = "synchronizeThumbnails"
var processing = "indexPhotosCatalog"

var fromIndexDir = "0"
var toIndexDir = "0"

var args = process.argv
if (args.length > 2) {
    args = process.argv.slice(2);

    if (args.length < 2)
        return console.log("args=node bin/ PhotosScanner.processDirs theque,processing,fromIndexDir, toIndexDir")
    theque = args[0]
    processing = args[1]
    if (args.length > 2)
        fromIndexDir = args[2]
    toIndexDir = args[3]

}
console.log(processing + " " + theque);

if( true)
PhotosScanner.processDirs(theque, processing, fromIndexDir, toIndexDir)












