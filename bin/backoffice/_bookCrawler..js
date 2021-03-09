const async = require("async");
const util = require("./util.");
const socket = require('../../routes/socket.js');
const request = require('request');
var pdfjsLib = require('pdfjs-dist');
const ndjson = require('ndjson');
const path = require('path');
const fs = require('fs');

const maxDocSize = 100000000;
const acceptedExtensions = ["pdf", "PDF"];

var bookCrawler = {

    indexSource: function (config, callback) {


        var filesToIndex = [];
        var t0 = new Date();
        async.series([
            function (callbackSeries) {

                function getFilesRecursive(dir) {
                    dir = path.normalize(dir);
                    if (dir.charAt(dir.length - 1) != path.sep)
                        dir += path.sep;

                    var files = fs.readdirSync(dir);
                    for (var i = 0; i < files.length; i++) {
                        var fileName = dir + files[i];
                        var stats = fs.statSync(fileName);
                        var infos = {};
                        if (stats.isDirectory()) {
                            getFilesRecursive(fileName)
                        } else {
                            var p = fileName.lastIndexOf(".");
                            if (p < 0)
                                continue;
                            var extension = fileName.substring(p + 1).toLowerCase();
                            if (acceptedExtensions.indexOf(extension) < 0) {
                                socket.message("!!!!!!  refusedExtension " + fileName);
                                continue;
                            }
                            if (stats.size > maxDocSize) {
                                socket.message("!!!!!! " + fileName + " file  too big " + Math.round(stats.size / 1000) + " Ko , not indexed ");
                                continue;
                            }
                            filesToIndex.push({fileName: fileName, infos: infos});
                        }
                    }
                }

                getFilesRecursive(config.connector.dirPath);
                return callbackSeries();
            },


            function (callbackSeries) {
                if (filesToIndex.length == 0)
                    return callbackSeries();
                var message = "begin indexation of " + filesToIndex.length + " books";
                socket.message(message);
                async.eachSeries(filesToIndex, function (pdfObj, callbackEach) {
                        bookCrawler.indexBook(config, pdfObj, function (err, result) {
                            if (err)
                                return callbackEach(err)
                            var duration = new Date().getTime() - t0;
                            var message = "indexed book" + pdfObj.fileName + "  in " + duration + " msec.";
                            socket.message(message);
                            callbackEach();
                        })
                    },
                    function (err) {
                        callbackSeries(err);
                    })
            },
        ], function (err) {
            callback(err);
        })
    },
    indexBook: function (config, pdfObj, callback) {
        var elasticUrl = config.indexation.elasticUrl;
        var index = config.general.indexName;
        var docTitle = "";
        var pdfPages = [];
        var t0 = new Date();
        var pdfPath = pdfObj.fileName;
        async.series([

            //getDocTitle
            function (callbackSeries) {
                var p = pdfPath.lastIndexOf("\\");
                if (p < 0)
                    p = pdfPath.lastIndexOf("/");//unix
                docTitle = pdfPath.substring(p + 1)
                docTitle = docTitle.substring(0, docTitle.indexOf("."))

                return callbackSeries()

            },

            //parse pdf
            function (callbackSeries) {
                var message = "parsing pdf  " + pdfPath + " it can take time...";
                socket.message(message);
                bookCrawler.parsePdf(pdfPath, function (err, result) {
                    if (err)
                        return callbackSeries(err);

                    pdfPages = result;
                    return callbackSeries();
                })

            },


            // run indexation of each page
            function (callbackSeries) {
                var ndjsonStr = ""
                var serialize = ndjson.serialize();
                serialize.on('data', function (line) {
                    ndjsonStr += line; // line is a line of stringified JSON with a newline delimiter at the end
                })

                var str = "";
                var currentPage = 0;
                pdfPages.forEach(function (page, pageIndex) {
                    var id = docTitle + "_" + (pageIndex + 1)
                    var title = docTitle + "_" + (pageIndex + 1)
                    currentPage = pageIndex + 1
                    ;
                    var obj = {title: title, page: "page " + (pageIndex + 1)}
                    if (config.schema.contentField.indexOf(".") < 0)
                        obj[config.schema.contentField] = page;
                    else {// attention pas générique
                        obj.attachment = {content: page}
                    }


                    str += JSON.stringify({index: {"_index": index, _type: index, "_id": id}}) + "\r\n"
                    str += JSON.stringify(obj) + "\r\n"

                    //   serialize.write({"_index": index, "_id": id})
                    //   serialize.write({title: docTitle, pdfPath: docPath, page: (pageIndex + 1), content: page})

                })
                serialize.end();
                var options = {
                    method: 'POST',
                    body: str,
                    encoding: null,
                    headers: {
                        'content-type': 'application/json'
                    },

                    url: elasticUrl + "_bulk"
                };

                request(options, function (error, response, body) {

                    if (error)
                        return callbackSeries(error);

                    if (currentPage % 20 == 0) {
                        var duration = new Date().getTime() - t0;
                        var message = "indexed " + currentPage + " pages in " + duration + " msec.";
                        socket.message(message);
                    }
                    const elasticRestProxy=require('../elasticRestProxy..js')
                    elasticRestProxy.checkBulkQueryResponse(body, function(err,result){
                        if(err)
                            return callbackSeries(err);
                        var message = "indexed " + result.length + " records ";
                        socket.message(message)
                        return callbackSeries()

                    })
                })
            }


        ], function (err) {
            callback(err);
        })


    },
    parsePdf: function (pdfPath, callback) {
        var rawData = new Uint8Array(fs.readFileSync(pdfPath));
        var loadingTask = pdfjsLib.getDocument(rawData);
        loadingTask.promise.then(function (pdfDocument) {
            console.log('# PDF document loaded.' + pdfPath);
            var totalPagesCount = pdfDocument.numPages;


            var pageIndexes = [];
            for (var i = 0; i < totalPagesCount; i++) {
                pageIndexes.push(i + 1)

            }
            var textPages = []
            async.eachSeries(pageIndexes, function (pageIndex, callbackEachPage) {
                pdfDocument.getPage(pageIndex).then(function (page) {
                    var textContents = [];
                    var str = ""
                    page.getTextContent({normalizeWhitespace: true}).then(function (textContent) {
                        textContents = textContent;
                        textContent.items.forEach(function (textItem) {
                            str += textItem.str
                            //	console.log(textItem.str);
                        });
                        textPages.push(str);
                        callbackEachPage();

                    });
                })
            }, function (err) {
                if (err)
                    return callback(err);
                return callback(null,textPages);
            })
        })
    }

    ,
     generateDefaultMappingFields: function (connector, callback) {
    var fields=
        {

            "title": {type: "text"},
            "page": {type: "keyword"},
        }
    callback(null, fields)

}


}
module.exports = bookCrawler;
