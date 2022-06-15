const async = require('async')
const fs = require('fs');
const {get} = require("superagent/lib/client");
const path = require('path')
const PhotoScanner = require('./PhotosScanner.')
const indexer = require('./backoffice/indexer.')

const mergeArkotheque = require('./backoffice/mergeArkotheque.')
const elasticProxy = require("./elasticRestProxy.");

var Synchronizer = {
    allMessages: "",
    message: function (message) {
        console.log(message)
    },
    getConfig: function () {
        if (Synchronizer.config)
            return Synchronizer.config;
        else {
            var configPath = path.resolve(__dirname, '../config/ATD/syncConfig.json')
            var str = fs.readFileSync(configPath);
            Synchronizer.config = JSON.parse(str);
            return Synchronizer.config;
        }

    },

    synchronizeAll: function (options, callback) {
        if (!options) {
            options = {}
        }
        async.series([
            function (callbackSeries) {
                if (options.tasks.indexOf("syncIndexes") < 0)
                    return callbackSeries();
                Synchronizer.message(" start syncIndexes")
                Synchronizer.syncIndexes({}, function (err, result) {
                    if (err) {
                        Synchronizer.message(err)
                        return callbackSeries(err)
                    }


                    Synchronizer.message(" finished syncIndexes")
                    return callbackSeries()
                })
            },
            function (callbackSeries) {
                if (options.tasks.indexOf("updateIndexVersements") < 0)
                    return callbackSeries();
                Synchronizer.message(" start updateIndexVersements")
                Synchronizer.updateIndexVersements({}, function (err, result) {
                    if (err) {
                        Synchronizer.message(err)
                        return callbackSeries(err)
                    }


                    Synchronizer.message(" finished updateIndexVersement")
                    return callbackSeries()
                })
            },
            function (callbackSeries) {
                if (options.tasks.indexOf("syncPhotosIndexes") < 0)
                    return callbackSeries();
                Synchronizer.message(" start syncPhotosIndexes")
                Synchronizer.syncPhotosIndexes({}, function (err, result) {
                    if (err) {
                        Synchronizer.message(err)
                        return callbackSeries(err)
                    }


                    Synchronizer.message(" finished syncPhotosIndexes")
                    return callbackSeries()
                })
            }

        ]), function (err) {
            return callback(err, " SYNCHRONIZATION FINISHED ")
        }


    },


    // update databases
    // regenerate indexe
    syncIndexes: function (options, callback) {
        console.log(" NOT READY YET")
        return callback()


        var config = Synchronizer.getConfig();
        var indexesToRefresh = config.indexes;

        async.eachSeries(indexesToRefresh, function (index, callbackEachIndex) {
            var indexConfig = null;
            async.series([
                    function (callbackSeries) {
                        var indexConfigPath = path.resolve(__dirname, "../config/elastic/sources/" + index)

                        try {
                            var str = "" + fs.readFileSync(indexConfigPath)
                            indexConfig = JSON.parse(str)
                        } catch (err) {
                            return callbackSeries(err);
                        }
                        return callbackSeries()
                    },
                    function (callbackSeries) {
                        console.log("processing " + indexConfig.indexName)

                        indexConfig.indexation = {
                            elasticUrl: config.elasticUrl,
                            deleteOldIndex: true
                        }

                        var connector = indexConfig.connector;
                        console.log("indexing" + indexesToRefresh)
                        indexer.runIndexation(indexConfig, function (err, result) {
                            if (err)
                                return callbackSeries(err);

                            return callbackSeries(null, "indexed" + indexesToRefresh)

                        })


                    }],
                function (err) {
                    if (err)
                        return callbackEachIndex(err)
                })
        }, function (err) {
            if (err)
                return console.log(err)


        })

    },

    updateIndexVersements: function (options, callback) {

        var file = Synchronizer.getConfig().arko_index_update.dumpFile
        var index = Synchronizer.getConfig().arko_index_update.index
        // index versement  arkotheque
        mergeArkotheque.updateVersementsIndex(file, index, function (err, result) {
            if (err)
                return callback(err)
            callback(null, "updateIndexVersement DONE")
        })

    },
    syncPhotosIndexes: function (options, callback) {
        var theques = Synchronizer.getConfig().photo_catalog_theques;
        async.eachSeries(theques, function (theque, callbackEach) {
            Synchronizer.message("indexing theque " + theque)
            PhotoScanner.processDirs(theque, "indexPhotosCatalog", null, null, function (err, result) {
                if (err)
                    return callbackEach(err)
                Synchronizer.message("indexing theque " + theque + " done")
                callbackEach();
            })
        }, function (err) {
            return callback(err, "All photos indexed ")
        })
    }

    ,

    function(options, callback) {


        var getAllFiles = function (rootDir) {
            var allFiles = []

            function recurse(dir) {
                var files = fs.readdirSync(dir)
                for (var i = 0; i < files.length; i++) {
                    var filePath = dir + files[i];
                    var stats = fs.statSync(filePath);

                    if (stats.isDirectory(filePath)) {
                        recurse(filePath + "/")
                    } else {
                        allFiles.push(filePath)
                    }
                }
            }

            recurse(rootDir);
            return allFiles
        }


        var IRsourceDir = Synchronizer.getConfig().paths.IR_sourceDir;
        var IR_targetPdfDir = Synchronizer.getConfig().paths.IR_targetPdfDir
        var toPdf = require("office-to-pdf")
        var files = getAllFiles(IRsourceDir)
        async.eachSeries(files, function (file, callbackEach) {
                console.log(file)

                var wordBuffer = fs.readFileSync(file)
                toPdf(wordBuffer).then((pdfBuffer) => {
                        var fileName = file.substring(file.lastIndexOf("/") + 1)
                        var p = fileName.lastIndexOf(".")
                        fileName = fileName.substring(0, p + 1) + "pdf"
                        var targetPath = IR_targetPdfDir + fileName
                        fs.writeFileSync(targetPath, pdfBuffer)
                        console.log("done " + targetPath)
                        callbackEach();
                    }, (err) => {
                        console.log(err)
                        return callbackEach(err)
                    }
                )
            }
            , function (err) {
                return callback(err)
            })
    }


}

module.exports = Synchronizer
//var x=Synchronizer.getConfig()

/*Synchronizer.syncPhotosIndexes({}, function (err, result) {

})*/


const myArgs = process.argv.slice(2);
console.log('myArgs: ', myArgs);


var possibleTasks = [
    "syncIndexes",
    "updateIndexVersements",
    "syncPhotosIndexes"
]

var tasks = []
myArgs.forEach(function (arg) {
    if (possibleTasks.indexOf(arg) < 0) {
        return console.log("arguments values must be  in " + possibleTasks.toString())
    }
    tasks.push(arg)

})
if (myArgs.length == 0 || tasks.length == 0)
    return console.log("Nothing to do");
else {
    var options = {tasks: tasks}
    Synchronizer.synchronizeAll(options, function (err, result) {

    })
}


