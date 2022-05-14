var fs = require('fs')
var request = require('request');
var async = require('async')
const csv = require('csv-parser')
const {get} = require("superagent/lib/client");

var util = require('./util.')
const elasticRestProxy = require("../elasticRestProxy.");
const socket = require("../../routes/socket");
var mergeArkotheque = {

    updateBordereauxIndex: function (arkothequeFilePath, versementsIndex, callback) {

        var arkothequeData = {}
        var mergedData = []
        var results = []
        var countFichesEntree = 0
        var countMissingBordereaux = 0
        var countUpdatedBordereaux = 0
        var countErrorOnUpdateBordereaux = 0
        var fichesWithtoutBordereau = []

        var elasticUrl = "http://192.168.2.2:2009/";
        var arkothequePrefix = "Arko_"
        var versementsIndex = "versements"

        async.series([
                function (callbackSeries) {

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
                            // 'lien_fichiers', 'intitule', 'bordereauId', 'producteurs'
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
                                    params[ key.trim()] = "'" + line[key] + "'";
                            }
                            return params
                        }

                        var numero = line.numeroUnique.substring(4)
                        var script = {
                            "source": getScript(),
                            "lang": "painless",
                            "params" : getParams()
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
                            ,script:script



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
                                    countUpdatedBordereaux += 1
                                else
                                    var x = line
                            } else {
                                fichesWithtoutBordereau.push(line);
                                countErrorOnUpdateBordereaux += 1
                                var x = query;
                                console.log(" error " + line.numeroEntree)
                            }
                            callbackEach()

                        })

                    }, function (err) {
                        callbackSeries()
                    })


                },


                //insert fiches entree sans brodereaux
                function (callbackSeries) {
                    var bulkStr = ''
                    fichesWithtoutBordereau.forEach(function (line) {
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
                console.log(JSON.stringify({
                    countFichesEntree: countFichesEntree,
                    countMissingBordereaux: countMissingBordereaux,
                    countUpdatedBordereaux: countUpdatedBordereaux,
                    countErrorOnUpdateBordereaux: countErrorOnUpdateBordereaux
                }))

            }
        )
    }
}

var arkothequeFilePath = "/home/claude/arkotheque1.csv"
module.exports = mergeArkotheque

mergeArkotheque.updateBordereauxIndex(arkothequeFilePath, "versements", function (err, result) {

})


/*/ search versements
                , function (callbackSeries) {
                    return callbackSeries();
                    var ndjson = ""

                    for (var key in arkothequeData) {
                        var numero = key.substring(4)
                        mergedData.push(arkothequeData[key])
                        if (numero) {
                            ndjson += JSON.stringify({index: versementsIndex}) + "\r\n"
                            ndjson += JSON.stringify({
                                "query": {
                                    "match": {
                                        "title": {
                                            "query": "\"" + numero + "\""
                                        }
                                    }
                                }
                            }) + "\r\n";
                        }
                    }


                    var options = {
                        method: 'POST',
                        body: ndjson,
                        encoding: null,
                        headers: {
                            'content-type': 'application/json'
                        },
                        url: elasticUrl + "/_msearch"
                    };

                    // console.log(ndjson)

                    request(options, function (error, response, body) {
                        if (error)
                            return callbackSeries(error);
                        if (body.error && body.error.reason)
                            return callback(body.error.reason)
                        var json = JSON.parse(response.body);
                        json.responses.forEach(function (item, line) {

                            if (item.hits && item.hits.hits && item.hits.hits.length > 0) {
                                countBordereaux += 1
                                try {
                                    var hit = item.hits.hits[0]
                                    mergedData[line].bordereauId = hit._id
                                } catch (e) {
                                    var x = e
                                }
                            } else {
                                countMissingBordereaux += 1
                            }


                        })
                        console.log(countBordereaux + "  missing" + countMissingBordereaux)
                        callbackSeries()
                    })

                }


                ,

                function (callbackSeries) {

                    async.eachSeries(mergedData, function (line, callbackSeries) {
                        return callbackSeries();

                        if (!line.bordereauId)
                            return callbackSeries()
                        var script = "";
                        var escapeCols = [
                            'lien_fichiers', 'intitule', 'bordereauId', 'producteurs'
                        ]
                        for (var key in line) {
                            if (escapeCols.indexOf(key) < 0)
                                script += "ctx._source." + key.trim() + " = '" + line[key] + "';"
                        }

                        var query = {
                            "script": script
                        }

                        var options = {
                            method: 'POST',
                            json: query,
                            headers: {
                                'content-type': 'application/json'
                            },
                            url: elasticUrl + "versements/_update/" + line.bordereauId
                        };


                        //  console.log(JSON.stringify(query, null, 2));
                        request(options, function (error, response, body) {
                            if (error)
                                return callbackSeries(err);
                            if (body.result == "updated") {
                                countUpdatedBordereaux += 1
                            } else {
                                var x = query;
                                console.log(" error " + line.bordereauId)
                            }
                        })
                        callbackSeries()
                    })

                }
                */


