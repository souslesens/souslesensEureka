/**
 * https://publications.europa.eu/en/web/eu-vocabularies/th-dataset/-/resource/dataset/eurovoc/version-20181220-0
 */

var fs = require('fs');
var async = require('async');
var request = require('request');
var ndjson = require('ndjson');
const socket = require('../../routes/socket.js');
const elasticRestProxy = require('../elasticRestProxy..js');
const skosReader = require('./skosReader..js');
var totalAnnotations = 0;
var annotator_skos = {


    /**********************************************************************************************************************************************
     *
     * @param entities

     * @param globalOptions
     */
    annotate: function (globalOptions, entities, callback) {
        globalOptions.indexEntities = true;
        if (globalOptions.maxEntities)
            globalOptions.maxEntities = 10000;

        if (!globalOptions.corpusIndex)
            return callback("No corpus Index")
        if (!globalOptions.elasticUrl)
            return callback("No Elastic URL")
        if (globalOptions.elasticUrl.charAt(globalOptions.elasticUrl.length - 1) != "/")
            globalOptions.elasticUrl += "/";
        if (!globalOptions.highlightFields)
            globalOptions.highlightFields = ["attachment.content"]


        if (globalOptions.highlightFields) {
            globalOptions.highlightFieldsMap = {}
            globalOptions.searchField = globalOptions.highlightFields
            globalOptions.highlightFields.forEach(function (field) {
                globalOptions.highlightFieldsMap[field] = {};
            })
        }


        async.series([


                // match entities on each doc of corpus index (all fields) and set documents field of each entities withe doc matching entity query
                function (callbackSeries) {
                    annotator_skos.findEntitiesDocuments(globalOptions, entities, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        callbackSeries();


                    })

                },
                function (callbackSeries) {//if ! globalOptions.append delete thesaurus field in corpus index and set mappings
                    if (globalOptions.append)
                        return callbackSeries();
                    annotator_skos.prepareCorpusIndexForEntities(globalOptions, function (err, result) {
                        globalOptions.append = false;
                        if (err)
                            return callbackSeries(err);
                        callbackSeries();
                    })

                },

                function (callbackSeries) {// update corpus index with entities
                    annotator_skos.updateCorpusIndexWithEntities(globalOptions, entities, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        callbackSeries();
                    })
                }


            ],

            // at the end
            function (err) {
                if (err) {
                    console.log(err);
                    return callback(err)
                }
                console.log("Done");
                return callback(null, "DONE")
            }
        )


    },

    findEntitiesDocuments: function (globalOptions, entities, callback) {

        var message = "extractingEntities in docs " + entities.length
        console.log(message)
        socket.message(message)


        entities.forEach(function (entity, entityIndex) {


            if (entityIndex > globalOptions.maxEntities)
                return callbackSeries();

            var synonyms = [];

            if (entity.synonyms) {
                var synonyms = entity.synonyms.toString().toLowerCase()
                var queryString = "";
                var shouldQuery = [];
                entity.synonyms.forEach(function (synonym, indexSynonym) {

                    if (synonym != "") {
                        if (indexSynonym > 0)
                            queryString += " OR "

                        queryString += "\\\\\"" + synonym + "\\\\\"";


                    }
                })
                if (queryString.length > 0) {

                    entities[entityIndex].elasticQuery = {


                        "query": {
                            "query_string": {
                                "query": queryString,
                                "fields": globalOptions.searchField,

                            }
                        }

                        ,
                        "from": 0,
                        "size": 1000,
                        "_source": "_id",
                        "highlight": {
                            "number_of_fragments": 0,
                            "fragment_size": 0,
                            "fields": globalOptions.highlightFieldsMap,
                            "pre_tags": ["|"],
                            "post_tags": ["|"]


                        }
                    }

                }
            }
        })
        var ndjsonStr = ""
        var serialize = ndjson.serialize();
        serialize.on('data', function (line) {
            ndjsonStr += line; // line is a line of stringified JSON with a newline delimiter at the end
        })
        var nElasticQueries = 0
        var queriedEntities = [];
        if (entities.length == 0)
            return callback(null, entities);
        entities.forEach(function (entity, entityIndex) {
            if (entity.elasticQuery) {

                queriedEntities.push(entityIndex)
                serialize.write({index: globalOptions.corpusIndex})
                serialize.write(entity.elasticQuery)
                nElasticQueries += 1


            }
        })
        serialize.end();

        if (nElasticQueries == 0)
            return callback(null, []);
        var options = {
            method: 'POST',
            body: ndjsonStr,
            headers: {
                'content-type': 'application/json'
            },

            url: globalOptions.elasticUrl + "_msearch"
        };

        request(options, function (error, response, body) {
            if (error)
                return callbackSeries(error);
            var json = JSON.parse(response.body);
            if (json.error) {
                var x = str;
                return callback(json.error);
            }
            var responses = json.responses;

            if (!responses || !responses.forEach)
                var x = 3

            responses.forEach(function s(response, responseIndex) {
                entities[queriedEntities[responseIndex]].documentsMap = {};
                if (response.error) {
                    console.log(JSON.stringify(response.error.root_cause))
                    socket.message(JSON.stringify(response.error.root_cause))
                    return;
                }
                var hits = response.hits.hits;


                //   var splitFieldContentRegEx = /\[#([^\].]*)\]([^\[\\.]*)/gm
                var highlightRegEx = /(<em[^\/]*?>([^<]*)<\/em>)/gm;

                hits.forEach(function (hit) {
                    var document = {id: hit._id, index: hit._index, score: hit._score};

                    if (!entities[queriedEntities[responseIndex]].documentsMap[document.id])
                        entities[queriedEntities[responseIndex]].documentsMap[document.id] = document;
                    totalAnnotations += 1;
                    var offsets = [];


                    if (hit.highlight) {//&& hit.highlight[globalOptions.searchField]) {
                        globalOptions.searchField.forEach(function (field) {
                            if (hit.highlight[field]) {
                                hit.highlight[field].forEach(function (highlight) {
                                    var splitArray = highlight.split("|");

                                    var str = ""
                                    var start;
                                    var end;
                                    splitArray.forEach(function (chunk, index) {
                                        str += chunk;

                                        if (index % 2 == 0) {
                                            start = str.length;
                                        } else {
                                            end = str.length;
                                            var offset = {field: field, syn: chunk, end: end, start: start}
                                            offsets.push(offset)
                                        }

                                    })

                                })
                            }
                        })


                    }
                    offsets.sort(function (a, b) {
                        if (a.start > b.start)
                            return -1;
                        if (b.start > a.start)
                            return 1;
                        return 0;


                    })
                    document.entityOffsets = offsets;

                })
            })
            var message = "total Annotations " + totalAnnotations + " on " + entities.length + " entities ";
            console.log(message);
            socket.message(message);
            callback(null, entities);
        })


    },


    prepareCorpusIndexForEntities: function (globalOptions, callback) {
        async.series([
            function (callbackSeries) {
                var script = {
                    "script": "ctx._source.remove('" + "entities_" + globalOptions.thesaurusIndex + "')",
                    "query": {
                        "exists": {"field": "entities_" + globalOptions.thesaurusIndex}
                    }
                }

                var options = {
                    method: 'POST',
                    json: script,
                    headers: {
                        'content-type': 'application/json'
                    },
                    url: globalOptions.elasticUrl + globalOptions.corpusIndex + "/_update_by_query?conflicts=proceed&refresh=true"
                };

                request(options, function (error, response, body) {
                        if (error)
                            return callbackSeries(error);
                        const indexer = require('./indexer..js')
                        elasticRestProxy.checkBulkQueryResponse(body, function (err, result) {
                            if (err)
                                return callbackSeries(err);
                            var message = "mappings updated " + globalOptions.corpusIndex;
                            socket.message(message)
                            return callbackSeries()

                        })
                    }
                )
            },

            function (callbackSeries) {// create /update mappings for entity field

                var json = {
                    [globalOptions.corpusIndex]: {
                        "properties": {
                            ["entities_" + globalOptions.thesaurusIndex]: {
                                //   "type": "keyword"
                                //  "type": "nested",
                                "properties": {

                                    id: {type: "keyword"},
                                    id_str: {type: "text"},
                                    offsets: {
                                        "properties": {
                                            start: {type: "integer"},
                                            end: {type: "integer"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                var options = {
                    method: 'POST',
                    json: json,
                    headers: {
                        'content-type': 'application/json'
                    },
                    url: globalOptions.elasticUrl + globalOptions.corpusIndex + "/" + globalOptions.corpusIndex + "/_mappings"
                };

                request(options, function (error, response, body) {
                        if (error)
                            return callbackSeries(error);
                        const indexer = require('./indexer..js')
                        elasticRestProxy.checkBulkQueryResponse(body, function (err, result) {
                            if (err)
                                return callbackSeries(err);
                            var message = "mappings updated " + globalOptions.corpusIndex;
                            socket.message(message)
                            return callbackSeries()

                        })
                    }
                )


            }], function (err) {
            if (err)
                return callback(err);
            return callback();
        })
    },
    updateCorpusIndexWithEntities: function (globalOptions, entities, callback) {

        var documentsEntitiesMap = {};
        entities.forEach(function (entity) {

            if (!entity.documentsMap)
                return;


            for (var docId in entity.documentsMap) {
                var doc = entity.documentsMap[docId];
                if (!documentsEntitiesMap[doc.id])
                    documentsEntitiesMap[doc.id] = []

                documentsEntitiesMap[doc.id].push({id: entity.internal_id, offsets: doc.entityOffsets})

            }
        })
        var documentKeys = Object.keys(documentsEntitiesMap);
        if (documentKeys.length == 0)
            return callback();

        var fetchSize = 10000;
        var slicedDocumentKeys = [];
        var p = 0;
        var q = 0;
        while (p < documentKeys.length) {
            q = p + fetchSize;

            slicedDocumentKeys.push(documentKeys.slice(p, q));
            p = q;

        }

        async.eachSeries(slicedDocumentKeys, function (documentKeys, callbackEach) {
            var ndjsonStr = ""
            var serialize = ndjson.serialize();
            serialize.on('data', function (line) {
                ndjsonStr += line; // line is a line of stringified JSON with a newline delimiter at the end
            })


            for (var docId in documentsEntitiesMap) {

                var entities = documentsEntitiesMap[docId];


                entities.forEach(function (entity) {
                    entity.id_str = entity.id;

                    var script = {
                        "script": {
                            "source": "if(ctx._source.entities_" + globalOptions.thesaurusIndex + " instanceof List!=true){ctx._source.entities_" + globalOptions.thesaurusIndex + "=[]} ctx._source.entities_" + globalOptions.thesaurusIndex + ".add(params.entity)",
                            "lang": "painless",
                            "params": {entity: entity}

                        }
                    }

                    serialize.write({update: {_id: docId, _index: globalOptions.corpusIndex, _type: globalOptions.corpusIndex}})
                    serialize.write(script)
                })


            }
            serialize.end();

            var options = {
                method: 'POST',
                body: ndjsonStr,
                headers: {
                    'content-type': 'application/json'
                },
                url: globalOptions.elasticUrl + "_bulk?refresh=wait_for"
            };

            request(options, function (error, response, body) {
                if (error)
                    return callbackEach(error);
                const indexer = require('./indexer..js')
                elasticRestProxy.checkBulkQueryResponse(body, function (err, result) {
                    if (err)
                        return callbackEach(err);

                    return callbackEach()

                })
            })
        }, function (err) {
            if (err)
                return callback(err)

            callback();
        })


    },
    indexThesaurus: function (globalOptions, entities, callback) {

        async.series([
            function (callbackSeries) {


                var options = {
                    method: 'HEAD',
                    headers: {
                        'content-type': 'application/json'
                    },
                    url: globalOptions.elasticUrl + globalOptions.thesaurusIndex
                };
                request(options, function (error, response, body) {
                    if (error)
                        return callbackSeries(error);
                    if (response.statusCode != 200)
                        callbackSeries();
                    else {
                        var options = {
                            method: 'DELETE',
                            headers: {
                                'content-type': 'application/json'
                            },
                            url: globalOptions.elasticUrl + globalOptions.thesaurusIndex
                        };
                        request(options, function (error, response, body) {
                            if (error)
                                return callbackSeries(error);
                            var message = "delete index :" + globalOptions.thesaurusIndex;
                            console.log(message);
                            socket.message(message);
                            callbackSeries();
                        })
                    }
                })
            }
            ,
            // create thesaurus index
            function (callbackSeries) {


                var json = {
                    "mappings": {
                        [globalOptions.thesaurusIndex]: {
                            "properties": {
                                "internal_id": {
                                    "type": "keyword"
                                },
                                "id": {
                                    "type": "keyword"
                                },
                                "synonyms": {
                                    "type": "text"
                                },
                                "schemes": {
                                    "type": "keywords"
                                },
                                "documents": {
                                    "properties": {
                                        "id": {
                                            "type": "keyword"
                                        },
                                        "score": {
                                            "type": "float"
                                        },
                                        "index": {
                                            "type": "keyword"
                                        }
                                    }
                                }
                            },

                        }
                    }
                }

                var options = {
                    json: json,
                    method: 'PUT',
                    headers: {
                        'content-type': 'application/json'
                    },
                    url: globalOptions.elasticUrl + globalOptions.thesaurusIndex
                };
                request(options, function (error, response, body) {
                    if (error)
                        return callbackSeries(error);
                    console.log("index thesaurus_" + globalOptions.thesaurusIndex + " created")
                    socket.message("index thesaurus_" + globalOptions.thesaurusIndex + " created")
                    callbackSeries();
                })
            }
            ,

            function (callbackSeries) {  // indexEntities


                console.log("indexing entities ");
                socket.message("indexing entities");

                var slicedData = [];
                var fetchSize = 100;
                var p = 0;
                var q = 0;
                do {
                    q = p + fetchSize;
                    slicedData.push(entities.slice(p, q));
                    p = q;
                } while (p < entities.length)

                var totalEntities = 0
                async.eachSeries(slicedData, function (slice, callbackEach) {
                    var ndJson = ""
                    var serialize = ndjson.serialize();
                    serialize.on('data', function (line) {
                        ndJson += line; // line is a line of stringified JSON with a newline delimiter at the end
                    })

                    slice.forEach(function (entity) {

                        entity.documents = []
                        if (entity.documentsMap) {
                            for (var key in entity.documentsMap) {
                                entity.documents.push(entity.documentsMap[key])
                            }
                            delete entity.documentsMap;
                            var newElasticId = Math.round(Math.random() * 10000000)
                            serialize.write({"index": {"_index": globalOptions.thesaurusIndex, "_type": globalOptions.thesaurusIndex, "_id": newElasticId}})
                            serialize.write(entity);
                        } else if (globalOptions.indexEntitiesWithhoutDocs) {
                            serialize.write({"index": {"_index": globalOptions.thesaurusIndex, "_type": globalOptions.thesaurusIndex, "_id": newElasticId}})
                            serialize.write(entity);
                        }

                    })
                    serialize.end();
                    var options = {
                        method: 'POST',
                        body: ndJson,
                        headers: {
                            'content-type': 'application/json'
                        },
                        url: globalOptions.elasticUrl + "/_bulk?refresh=wait_for"
                    };
                    request(options, function (error, response, body) {
                        if (error)
                            return callbackEach(error);
                        var json = JSON.parse(response.body);
                        var message = "indexed " + (totalEntities += slice.length) + " in index  thesaurus_" + globalOptions.thesaurusIndex;
                        console.log(message);
                        socket.message(message)
                        callbackEach();


                    })
                }, function (err) {
                    if (err)
                        return callback();
                    callback()
                })
            },


        ], function (err) {
            if (err)
                return callback(err);
            return callback(null, entities);
        })
    }

    ,


    annotateCorpusFromRDFfile: function (thesaurusConfig, index, elasticUrl, callback) {
        var thesaurusIndexName = thesaurusConfig.name.toLowerCase()
        socket.message("Parsing  thesaurus " + thesaurusIndexName + " from file " + thesaurusConfig.skosXmlPath)
        skosReader.rdfToAnnotator(thesaurusConfig.skosXmlPath, thesaurusConfig, function (err, result) {
            if (err)
                return callback(err);
            var entities = result;
            socket.message("extracted " + entities.length + "entities  from thesaurus from file " + thesaurusConfig.skosXmlPath)
            var fetchSize = 50
            var options = {
                corpusIndex: index,
                thesaurusIndex: thesaurusIndexName,
                elasticUrl: elasticUrl,
                highlightFields: thesaurusConfig.highlightFields
            }


            var slicedData = [];
            var p = 0;
            var q = 0;
            do {
                q = p + fetchSize;
                slicedData.push(entities.slice(p, q));
                p = q;

            } while (p < entities.length)


            var i = 0;
            totalAnnotations = 0;
            socket.message("Starting annotation of index " + options.corpusIndex + "with thesaurus " + options.thesaurusIndex)
            async.eachSeries(slicedData, function (slice, callbackEach) {
                if (slice.length == 0)
                    return callbackEach();
                if (i == 0)
                    options.append = false
                else
                    options.append = true
                annotator_skos.annotate(options, slice, function (err, result) {
                    if (err) {
                        console.log("ERROR :" + err)
                        return callbackEach(err);
                    }
                    i++;
                    socket.message("extracted  entities  from " + fetchSize * i + " documents")

                    return callbackEach();
                })
            }, function (err) {
                if (err)
                    return callback(err);

                if (options.thesaurusIndex) {

                    annotator_skos.indexThesaurus(options, entities, function (err, result) {
                        if (err)
                            return callback(err);
                        socket.message("Finished annotation of index " + options.corpusIndex + "with thesaurus " + options.thesaurusIndex)
                        callback(null, "ALL DONE")
                    })
                } else {
                    socket.message("Finished annotation of index " + options.corpusIndex + "with thesaurus " + options.thesaurusIndex)
                    callback(null, "ALL DONE")
                }
            })


        })
    }


}


if (false) {
    var thesaurusConfig = {
        "name": "thesaurus_tulsa",
        "skosXmlPath": "D:\\NLP\\Tulsa_all.rdf",
        "extractedLangages": "en",
        "outputLangage": "en"
    }

    skosReader.rdfToAnnotator(thesaurusConfig.skosXmlPath, thesaurusConfig, function (err, result) {
        if (err)
            return console.log(err);
        var entities = result;
        socket.message("extracted " + entities.length + "entities  from thesaurus from file " + thesaurusConfig.skosXmlPath)
        var options = {
            thesaurusIndex: thesaurusConfig.name,
            elasticUrl: "http://localhost:9200/",
            indexEntitiesWithhoutDocs: true

        }
        annotator_skos.indexThesaurus(options, entities, function (err, result) {
            if (err)
                return console.log(err);
        })

    })
}


module.exports = annotator_skos;

