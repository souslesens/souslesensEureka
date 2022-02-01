var fs = require('fs')
var path = require('path')
var Config = require('./globalParams.')
var elasticRestProxy = require('./elasticRestProxy.')
var async = require('async')
PhotosManager = {

    photosLimit: 10000,
    getPhotosList: function (filterStr, photosDir, options, callback) {
        var indexDirPath = Config.photos.miniaturesDirectory
        indexDirPath += photosDir + "/"
        indexDirPath = path.resolve(indexDirPath) + path.sep


        var data = []
        async.series([

            //get photosPaths
            function (callbackSeries) {


                var url = "photos-catalog-" + photosDir + "/_search"


                var allData = [];
                var offset = 0;
                var size = 500;
                var mustArray = []
                options.pattern.forEach(function (item, index) {
                    mustArray.push({
                        "match": {
                            ["dir" + (index + 1)]: item
                        }
                    })
                })
                var query = {
                    "query": {
                        "bool": {
                            "must": mustArray
                        }
                    }, "_source": {
                        "excludes": [
                            "attachment.content"
                        ]
                    }
                }
                var resultSize = 1;
                async.whilst(
                    function (callbackTest) {//test
                        return callbackTest(null, resultSize > 0 && data.length < 100);
                    },

                    function (callbackWhilst) {
                        query.from = offset;
                        query.size = size

                        elasticRestProxy.executePostQuery(url, query, function (err, result) {
                            if (err)
                                return callbackWhilst(err)
                            var hits = result.hits.hits


                            resultSize = hits.length
                            offset += size;

                            hits.forEach(function (hit) {
                                if (hit._source.files && hit._source.files.length > 0) {
                                    data.push(hit._source)
                                }
                            })


                            callbackWhilst()

                        })


                    }, function (err) {
                        return callbackSeries(err)

                    })


            }


        ], function (err) {
            data=data.slice(0,100)
            var result = {files: data, dirPath: indexDirPath}
            return callback(err, result)
        })
    },




    getPhotosFromDir: function (dir, callback) {


        var sep = path.sep
        if (sep == "\\")
            dir = dir.replace(/\//g, sep)

        var dirs = dir.split(sep)
        var photodirs = []


        var photosDirIndex;
        dirs.forEach(function (dir, index) {
            if (dir == photosDirName)
                photosDirIndex = index
            photodirs.push(dir)
        })

        var photosPath = ""
        photodirs.forEach(function (dir, index) {

            if (index > photosDirIndex)
                return;
            if (index > 0)
                photosPath += sep
            photosPath += dir
        })


        function getRealDirName(path, name) {
            var subDirs = fs.readdirSync(path)
            var realDirName = null
            subDirs.forEach(function (subDir) {
                if (!realDirName && subDir.indexOf(name) == 0)
                    realDirName = subDir
            })
            return realDirName

        }

        var nSep = 1
        /*if(sep=="\\")// moins de slashes dans windows
            nSep=0*/
        for (var i = photosDirIndex + 1; i < photodirs.length - nSep; i++) {
            var realDirName = getRealDirName(photosPath, photodirs[i])
            if (!realDirName) {
                return callback(photodirs[i] + " not exists");
                break;
            }
            var newPath = photosPath + sep + realDirName.replace(/ /g, "\ ")
            photosPath += sep + realDirName.replace(/ /g, "\ ")
        }


        if (!fs.existsSync(photosPath)) {
            return callback(photosPath + " not exists");
        }
        var files = fs.readdirSync(photosPath)
        var result = {files: files, realPath: photosPath + sep}

        return callback(null, result);


    }


}

module.exports = PhotosManager
var x = "D:\\webstorm\\souslesensEureka\\public\\Photo\\6021\\003\\002"
//PhotosManager.getPhotosFromDir(x)

var options = {
    rootww: "Y:\\baillet\\miniaturesPhotos\\artotheque",
    rootxx: "D:\\webstorm\\souslesensVocables\\bin",
    root: "D:\\temp\\artotheque"
}

if (false) {
    glob("/**1107**.*", options, function (er, files) {

        var x = files
    })
}



