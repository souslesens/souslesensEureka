var fs = require('fs')
var request = require('request');
var async = require('async')
const csv = require('csv-parser')
const {get} = require("superagent/lib/client");

var util = require('./util.')
const elasticRestProxy = require("../elasticRestProxy.");
const socket = require("../../routes/socket");
var mergeArkotheque = {

    updateVersementsIndex: function (arkothequeFilePath, versementsIndex, callback) {

        var arkothequeData = {}
        var mergedData = []
        var results = []
        var countFichesEntree = 0
        var countMissingVersements = 0
        var countUpdatedVersements = 0
        var countErrorOnUpdateVersements = 0
        var fichesWithtoutVersements = []

        var elasticUrl = "http://192.168.2.2:2009/";
        var arkothequePrefix = "Arko_"
        var versementsIndex = "versements"

        async.series([
                function (callbackSeries) {
                    console.log("reading " + arkothequeFilePath)
                    fs.createReadStream(arkothequeFilePath)
                        .pipe(csv({separator: ';'}))
                        .on('data', (data) =>
                            results.push(data))
                        .on('end', () => {
                            var idKey = null
                            results.forEach(function (item, line) {


                                for (var key in item) {
                                    if (line == 0 && !idKey)
                                        idKey = key
                                    item.numeroUnique = item[idKey]
                                }

                                arkothequeData[item[idKey]] = item

                            })
                            for (var key in arkothequeData) {
                                mergedData.push(arkothequeData[key])
                            }
                            countFichesEntree = mergedData.length
                            //   console.log(results);
                            callbackSeries()
                        });


                }
                , function (callbackSeries) {
                    async.eachSeries(mergedData, function (line, callbackEach) {
                        var escapeCols = [
                            // 'lien_fichiers', 'intitule', 'VersementsId', 'producteurs'
                        ]

                        function getScript() {
                            var script = "";

                            for (var key in line) {
                                if (escapeCols.indexOf(key) < 0)
                                    script += "ctx._source." + arkothequePrefix + key.trim() + " = params." + key.trim() + ";"
                            }

                            return script

                        }

                        function getRemoveScript() {

                            var script = "";

                            for (var key in line) {
                                if (escapeCols.indexOf(key) < 0)
                                    script += " ctx._source.remove('" + arkothequePrefix + key.trim() + "');"

                            }

                            return script
                        }

                        function getParams() {
                            var params = {}
                            for (var key in line) {
                                if (escapeCols.indexOf(key) < 0)
                                    params[key.trim()] = "'" + line[key] + "'";
                            }
                            return params
                        }

                        var numero = line.numeroUnique.substring(4)
                        var script = {
                            "source": getScript(),
                            "lang": "painless",
                            "params": getParams()
                        }


                        // script=getRemoveScript()

                        var query = {
                            "query":
                                {

                                    "match": {
                                        "title": {
                                            "query": "\"" + numero + "\""
                                        }
                                    }

                                }
                            , script: script


                        }
                        var options = {
                            method: 'POST',
                            json: query,
                            headers: {
                                'content-type': 'application/json'
                            },
                            url: elasticUrl + versementsIndex + "/_update_by_query"
                        };

                        //  console.log(JSON.stringify(query, null, 2));
                        request(options, function (error, response, body) {
                            if (error)
                                return callbackEach(err);
                            if (body.updated) {
                                if (body.updated == 1)
                                    countUpdatedVersements += 1
                                else
                                    var x = line
                            } else {
                                fichesWithtoutVersements.push(line);
                                countErrorOnUpdateVersements += 1
                                var x = query;
                                // console.log(" error  line " + line.numeroEntree)
                            }
                            callbackEach()

                        })

                    }, function (err) {
                        console.log("Fiches entree added to index versements ")
                        callbackSeries()
                    })


                },


                //insert fiches entree sans brodereaux
                function (callbackSeries) {
                    console.log("indexation des fiches entrees sans versement")
                    var bulkStr = ''
                    fichesWithtoutVersements.forEach(function (line) {
                        var line2 = {}
                        for (var key in line) {
                            line2[arkothequePrefix + key] = line[key]
                        }

                        bulkStr += JSON.stringify({
                            index: {
                                _index: versementsIndex,
                                _type: versementsIndex,
                                _id: "ARKO_" + line.numeroEntree
                            }
                        }) + "\r\n"
                        bulkStr += JSON.stringify(line2) + "\r\n";

                    })


                    var options = {
                        method: 'POST',
                        body: bulkStr,
                        encoding: null,
                        timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
                        headers: {
                            'content-type': 'application/json'
                        },
                        url: elasticUrl + "_bulk?refresh=wait_for"
                    };

                    request(options, function (error, response, body) {
                        if (error) {
                            return callbackSeries(error)

                        }
                        const elasticRestProxy = require('../elasticRestProxy..js')
                        elasticRestProxy.checkBulkQueryResponse(body, function (err, result) {
                            if (err)
                                return callbackSeries(err);
                            var message = "indexed " + result + " records ";

                            console.log(message)
                            callbackSeries();
                        })
                    })
                }


            ]
            ,

            function (err) {
                if (err)
                    console.log(err)
                console.log(JSON.stringify({
                    countFichesEntree: countFichesEntree,
                    countMissingVersements: countMissingVersements,
                    countUpdatedVersements: countUpdatedVersements,
                    countErrorOnUpdateVersements: countErrorOnUpdateVersements,
                    //  fichesWithtoutVersements: JSON.stringify(fichesWithtoutVersements)
                }))
                callback()
            }
        )
    }
}

module.exports = mergeArkotheque;
if (false) {
    var arkothequeFilePath = "/home/claude/arkotheque1.csv"
    module.exports = mergeArkotheque

    mergeArkotheque.updateVersementsIndex(arkothequeFilePath, "versements", function (err, result) {

    })
}

