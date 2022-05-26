const async = require('async')
const fs = require('fs');
const {get} = require("superagent/lib/client");

const PhotoScanner=require('./PhotosScanner.')
const IndexerTheques=require('./backoffice/indexerTheques..')
const mergeArkotheque=require('./backoffice/mergeArkotheque.')

var Synchronizer = {

    getConfig: function () {
        if (Synchronizer.config)
            return Synchronizer.config;
        else {
            var str = fs.readFileSync('../config/ATD/syncConfig.json')
            Synchronizer.config = JSON.parse(str);
            return Synchronizer.config;
        }

    },

    synchronizeAll: function (options, callback) {

        async.series([
            function (callbackSeries) {

                return callbackSeries()
            }
            , function (callbackSeries) {

                return callbackSeries()
            }, function (callbackSeries) {

                return callbackSeries()
            }, function (callbackSeries) {

                return callbackSeries()
            }
            , function (callbackSeries) {

                return callbackSeries()
            }, function (callbackSeries) {

                return callbackSeries()
            }


        ]), function (err) {
            return callback(err)
        }


    },


    // update databases
    // regenerate indexe
    syncIndexes: function (options, callback) {
        var indexesToRefresh = Synchronizer.getConfig().indexes;
        async.series([
            function (callbackSeries) {
            IndexerTheques.indexTheques(indexesToRefresh, function(err, result){
                callbackSeries()
            })
            },
            function (callbackSeries) {
            var file= Synchronizer.getConfig().arko_index_update.dumpFile
                var index= Synchronizer.getConfig().arko_index_update.index
            // index versement  arkotheque
                mergeArkotheque.updateBordereauxIndex(file,index,function(err, result){
                    callbackSeries(err)
                })

            }
        ]), function (err) {
            //syncIndexes
            return callback(err)
        }
    },
    syncPhotosIndexes: function (options, callback) {

        async.series([
            function (callbackSeries) {

                return callbackSeries()
            }
        ]), function (err) {
            return callback(err)
        }
    }

    ,
    syncIRpdfs: function (options, callback) {



        var getAllFiles = function (rootDir) {
            var allFiles = []

            function recurse(dir) {
                var files=fs.readdirSync(dir)
                for (var i = 0; i < files.length; i++) {
                    var filePath = dir + files[i];
                    var stats = fs.statSync(filePath);

                    if (stats.isDirectory(filePath) ){
                        recurse(filePath+"/")
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
                    var fileName=file.substring(file.lastIndexOf("/")+1)
                    var p=fileName.lastIndexOf(".")
                    fileName=fileName.substring(0,p+1)+"pdf"
                        fs.writeFileSync( IR_targetPdfDir+fileName,pdfBuffer)
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
Synchronizer.syncIRpdfs({},function(err, result){

})