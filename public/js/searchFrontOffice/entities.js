var Entities = (function () {
        var self = {}
        context.allowedThesauri = {}
        self.jsTreeNodesMap = {}


        self.loadUserThesauri = function (userGroups, callback) {
            var payload = {
                getUserThesauri: 1,
                userGroups: JSON.stringify(userGroups)
            }
            $.ajax({
                type: "POST",
                url: appConfig.elasticUrl,
                data: payload,
                dataType: "json",
                success: function (data, textStatus, jqXHR) {

                    context.userThesauri = data;
                    callback(null, data);

                }
                , error: function (err) {
                    console.log(err.responseText)
                    return callback(err)
                }

            });


        }


        self.setUserIndexesThesauri = function (indexes) {
            if (!indexes)
                indexes = context.curentSearchIndexes;
            var allowedThesauri = {};
            if (!Array.isArray(indexes))
                indexes = [indexes]
            indexes.forEach(function (index) {
                var indexThesauri = context.indexConfigs[index].thesauri;
                if (!indexThesauri)
                    return allowedThesauri;

                Object.keys(indexThesauri).forEach(function (indexThesaurus) {
                    if (context.userThesauri = "*" || context.userThesauri.indexOf(indexThesaurus) > -1)
                        allowedThesauri[indexThesaurus] = {};
                })

            })
            context.allowedThesauri = allowedThesauri;

        }
        self.showThesaurusEntities = function (thesaurusName, aggregation) {


            context.allowedThesauri[thesaurusName] = {foundEntities: aggregation.buckets};
            context.currentThesaurus = thesaurusName;
            var jsTreeArray = [];

            // get ancestors from entities in docs


            var entities = aggregation.buckets;
            if (!entities)
                return [];

            entities.sort(function (a, b) {
                if (a.key > b.key)
                    return 1;
                if (b.key > a.key)
                    return -1;
                return 0;
            });


            var map = {};
            entities.forEach(function (entity, indexEntities) {
                var ancestors = entity.key.split("-");
                var id = "";
                var parent = ""
                ancestors.forEach(function (ancestor, indexAncestor) {
                    parent = id;
                    if (indexAncestor > 0)
                        id += "-"
                    id += ancestor
                    if (!map[id]) {
                        var node = {text: ancestor, id: id, count: entity.doc_count, data: {thesaurusName: thesaurusName, descendants: []}}
                        if (indexAncestor > 0) {
                            node.parent = parent
                        } else {
                            node.parent = thesaurusName
                        }

                        map[id] = node
                    } else {

                    }

                })

            })


            // setDescendants

            var keys = Object.keys(map);
            for (var key1 in map) {

                keys.forEach(function (key2) {
                    if (key2 != key1) {
                        var p = key2.indexOf(key1 + "-");
                        if (p > -1)
                            map[key1].data.descendants.push(key2)

                    }
                })

            }


            // prepare tree data


            jsTreeArray.push({text: thesaurusName, id: thesaurusName, parent: "#"})
            for (var key in map) {
                var obj = map[key];
                obj.text += " " + obj.count
                jsTreeArray.push(map[key])
            }

            for (var key in map) {
                if (!self.jsTreeNodesMap[key])
                    self.jsTreeNodesMap[key] = map[key];
            }

            return jsTreeArray;
        }


        self.showAssociatedWords = function (aggregation) {

            var tokens = {};
            var html = "<ul>"

            aggregation.buckets.forEach(function (bucket) {
                if (!tokens[bucket.key])
                    tokens[bucket.key] = bucket;
            })


            var keys = Object.keys(tokens);
            var words = [];
            keys.forEach(function (key) {
                if (!isNaN(key))
                    return;
                if (stopWords_fr.indexOf(key) < 0)
                    words.push(key)
            })


            words.sort(function (a, b) {
                return a.score - b.score
            })
            html += "<li><span class='ui_title'>Mots associés</span></li></li></li>";
            words.forEach(function (key) {
                var word = key
                var p = key.indexOf("'");
                if (p > -1)
                    word = key.substring(p + 1)

                var doc_count = tokens[key].doc_count;
                html += "<li onclick=mainController.addAssciatedWordToQuestion('" + word + "')>(" + doc_count + " ) " + word + "</li>";


            })
            html += "</ul>";

            $("#associatedWordsDiv").html(html);
        }


        self.getQuestionEntities = function (query, callback) {

            Search.queryElastic({

                _source: {"excludes": ["data"]},
                from: 0,
                size: 5000,
                query: query,

            }, null, function (err, result) {
                if (err) {
                    return $("#resultDiv").html(err);
                }
                if (result.hits.hits.length == 0)
                    return $("#resultDiv").html("pas de résultats");
                var docIds = [];
                result.hits.hits.forEach(function (hit) {
                    docIds.push(hit._id);


                })
                var payload = config.hitsEntitiesQuery;
                payload.query.terms["data.documents.id"] = docIds
                var entities = [];
                Search.queryElastic(payload, "eurovoc_entities", function (err, result) {
                    if (err)
                        return callback(err);
                    entities = result.hits.hits;
                    //   console.log(JSON.stringify(entities, null, 2))
                    if (true) {//getParent entities
                        var parentEntities = [];
                        result.hits.hits.forEach(function (entity) {

                            parentEntities.push(entity._source.parent)
                        })
                        var payloadParents = {
                            from: 0,
                            size: 5000,
                            query: {

                                "terms": {
                                    "internal_id": parentEntities
                                }

                            }
                        }
                        Search.queryElastic(payloadParents, "eurovoc_entities", function (err, result2) {
                            if (err)
                                return callback(err);
                            parentEntities = result2.hits.hits;
                            result2.hits.hits.forEach(function (entity) {
                                entities.push(entity)
                            })

                            callback(null, entities)
                        })
                    } else

                        callback(null, entities.hits.hits)

                })


            })
        }

        self.showQuestionEntitiesInJsTree = function (query, callback) {
            self.getQuestionEntities(query, function (err, entities) {
                if (err)
                    return $("#resultDiv").html(err);

                function formatResult(entities) {
                    var conceptsMap = {};
                    entities.forEach(function (line) {
                        var concept = line._source;

                        conceptsMap[concept.id] = concept;
                    })
                    for (var key in conceptsMap) {
                        concept = conceptsMap[key];

                        function recurse(conceptId, chilDocumentCount) {
                            if (!concept.documents)
                                concept.documents = [];


                            if (!conceptsMap[conceptId].data.docsCount)
                                conceptsMap[conceptId].data.docsCount = chilDocumentCount;
                            conceptsMap[conceptId].data.docsCount += concept.documents.length;
                            if (conceptsMap[conceptId].parent && conceptsMap[conceptId].parent != "#")
                                if (conceptsMap[conceptId].parent) {
                                    conceptsMap[conceptId].parent = "#"
                                } else {
                                    recurse(conceptsMap[conceptId].parent, conceptsMap[conceptId].data.docsCount)
                                }


                        }

                        recurse(concept.id, 0)


                    }
                    var entitiesAnnotated = []

                    for (var key in conceptsMap) {
                        var concept = conceptsMap[key];

                        if (concept.data.docsCount) {
                            concept.text = "*" + concept.data.docsCount + "* " + concept.text
                        }

                        entitiesAnnotated.push(concept)


                    }
                    return entitiesAnnotated;
                }


                showNodeInfos = function (node) {

                }


                var jstreeArray = formatResult(entities);

                Entities.drawJsTree("jstreeDiv", jstreeArray)


            })

        }

        self.drawJsTree = function (treeDiv, jsTreeData) {
return
            var plugins = [];
            plugins.push("search");

            plugins.push("sort");
            /*   plugins.push("types");
               plugins.push("contextmenu");*/

            if ($('#' + treeDiv).jstree)
                $('#' + treeDiv).jstree("destroy")

            $('#' + treeDiv).jstree({
                'core': {
                    'check_callback': true,
                    'data': jsTreeData,


                }
                , 'contextmenu': {
                    'items': null
                },
                'plugins': plugins,
                "search": {
                    "case_sensitive": false,
                    "show_only_matches": true
                }
            }).on("select_node.jstree",
                function (evt, obj) {
                    var x = obj;
                    Entities.runEntityQuery(obj.node);
                    //   $("#dataDiv").html(JSON.stringify(obj.node.data,null,2))
                })
        }

        self.runEntityQuery = function (node) {
            if (!context.filteredEntities)
                context.filteredEntities = {}

            if (node) {

                var leafChildrenEntities = [];

                context.allowedThesauri[node.data.thesaurusName].foundEntities.forEach(function (entity) {
                    // take only leaf children entities
                    self.jsTreeNodesMap[node.id].data.descendants.forEach(function (descendant) {
                        if (self.jsTreeNodesMap[descendant].data.descendants.length == 0)
                            if (leafChildrenEntities.indexOf(descendant) < 0)
                                leafChildrenEntities.push(descendant)
                    })
                    //if node is leaf add it to query
                    if (self.jsTreeNodesMap[node.id].data.descendants.length == 0)
                        if (leafChildrenEntities.indexOf(node.id) < 0)
                            leafChildrenEntities.push(node.id)


                })
                context.filteredEntities[node.id] = {name: node.id, thesaurus: node.data.thesaurusName, childrenEntities: leafChildrenEntities};
            }


            var str = "";
            var html = ""

            for (var key in context.filteredEntities) {
                html += "<div class='selectedEntity' onclick='Entities.deleteEntityFilter(\"" + key + "\")'>" + key + "</div>";
            }


            // html+="<button onclick='graphController.showGraph()'>Graph...</button>"
            $("#selectedEntitiesDiv").html(html)


            var mustQueries = [];
            for (var key in context.filteredEntities) {
                var childrenMust = []
                context.filteredEntities[key].childrenEntities.forEach(function (entity) {
                    childrenMust.push(entity)
                })
                mustQueries.push({"terms": {["entities_" + node.data.thesaurusName + ".id"]: childrenMust}})
            }

            var options = {}
            if (mustQueries.length > 0) {
                options = {mustQueries: mustQueries}
            }
            Search.searchPlainText(options, function (err, result) {
                if (err)
                    return;
                //   Entities.hilightEntitiesSynonyms( context.filteredEntities)


            })

        }

        self.deleteEntityFilter = function (entity) {
            delete context.filteredEntities[entity];
            Entities.runEntityQuery()

        }

        self.showAllEntitiesTree = function (thesaurus) {
            self.getAllThesaurusEntities(thesaurus, function (err, buckets) {
                if (err)
                    return $("#resultDiv").html(err);
            })
        }
        self.getAllThesaurusEntities = function (_thesaurus, callback) {
            var thesaurus = _thesaurus
            var query = {
                query: {
                    "match_all": {}
                },
                "aggregations": {
                    ["entities_" + thesaurus]: {
                        "terms": {
                            "field": "entities_" + thesaurus,
                            "size": 500,
                            "order": {
                                "_count": "desc"
                            }
                        }
                    }
                },
                size: 0,
                _source: ""
            }

            Search.queryElastic(query, null, function (err, result) {
                if (err) {

                    return callback(err)
                }
                var buckets = result.aggregations["entities_" + thesaurus].buckets;
                return callback(null, buckets);

            })
        }
        self.setHitEntitiesHiglight = function (hit, entities) {
            var measurementUnitsEntities = ["time-day", "time-sec"]
            var fields = {};
            var entityNames = []
            entities.forEach(function (entity) {
                if (entityNames.indexOf(entity.id) < 0)
                    entityNames.push(entity.id)
                entity.offsets.forEach(function (offset) {
                    if (!fields[offset.field])
                        fields[offset.field] = {entities: [], offsets: {}}
                    fields[offset.field].entities.push(entity.id);
                    var entityIndex = entityNames.indexOf(entity.id);
                    if (measurementUnitsEntities.indexOf(entity.id) > -1)
                        entityIndex = -1


                    if (!fields[offset.field].offsets[offset.start]) {// une seule entite par offset et par field
                        fields[offset.field].offsets[offset.start] = {start: offset.start, end: offset.end, syn: offset.syn, entityIndexes: []}
                    }
                    fields[offset.field].offsets[offset.start].entityIndexes.push(entityIndex)


                })
            })
            context.currententityNames = entityNames;
            ;
            for (var field in fields) {
                var fieldChunks = [];
                var offsets = fields[field].offsets;

                var content
                if (hit._source[field])
                    content = hit._source[field];
                else {
                    var array = field.split(".")
                    content = hit._source[array[0]][array[1]];//attachment.content
                }
                if (!content) {
                    hit._source[field] = "";
                } else {

                    var keys = Object.keys(offsets);
                    keys.sort(function (a, b) {
                        a = parseInt(a);
                        b = parseInt(b)
                        if (a > b)
                            return 1;
                        if (b > a)
                            return -1;
                        return 0;
                    })
                    var fieldChunks = []
                    var p = 0;
                    keys.forEach(function (key) {
                        var offset = offsets[key];
                        var chunk = content.slice(p, offset.start);
                        fieldChunks.push(chunk);
                        chunk = content.slice(offset.start, offset.end);
                        if (chunk.indexOf("<em") > -1)
                            var x = 3

                        chunk = "<em class='E_" + offset.entityIndexes[0] + "'>" + chunk + "</em>"
                        fieldChunks.push(chunk);
                        p = offset.end
                    })
                    var chunk = content.slice(p, content.length);
                    fieldChunks.push(chunk);

                    var str = ""
                    fieldChunks.forEach(function (chunk) {
                        str += chunk;
                    })

                    if (hit._source[field])
                        hit._source[field] = str;
                    else {
                        var array = field.split(".")
                        hit._source[array[0]][array[1]] = str;//attachment.content
                    }

                }


            }

            return hit;
        }


        self.showEntityExtracts = function (emClass) {
            // var entities = context.allowedThesauri[context.currentThesaurus].foundEntities;

            var html = $("#detailsContentDiv").html();
            //var regex=new RegExp("<em class='entity "+emClass+"'>","gm");
            //  var array;
            var p = 0;
            var q = 0;
            var extracts = [];

            do {
                q = html.indexOf(emClass, p);
                if (q > -1) {
                    extracts.push(html.substring(Math.max(0, q - 40), Math.min(html.length - 1, q + 40)) + "");
                    p = q + 2;
                }
            } while (q > -1)
            var str = "";
            extracts.forEach(function (extract) {
                str += "..." + extract + "...<hr>"
            })

            $("#entityExtractDiv").html(str)
        }


        self.getEntitiesLegendDiv = function () {
            if (!context.currententityNames)
                return "";
            var html = "<div id='entities_legendDiv' style='display:flex;flex-direction:column; border: solid 1px;border-color: #8f8b8a; border-radius: 5px;width: 200px'>";
            html += "<div onclick='Entities.showEntitiesLegend();'>Entities ...</div>"
            html += "<div id='entities_legendList'></div>";

            html += "</div>"
            return html
        }

        self.showEntitiesLegend = function () {
            var html = $("#entities_legendList").html();
            if (html == "") {
                context.currententityNames.forEach(function (entity, entityIndex) {
                    html += "<em  class='E_" + entityIndex + "'>" + entity + "</em>&nbsp;";
                })
                $("#entities_legendList").html(html)
                $("em[class^='E_']").bind("click", function () {
                    var x = $(this)
                    var emClass = $(this).attr('class');
                    // var index = parseInt(emClass.substring(emClass.lastIndexOf("_") + 1))
                    Entities.showEntityExtracts(emClass)

                })
            } else {
                $("#entities_legendList").html("")

            }
            $("#entityExtractDiv").html("");

        }

        return self;


    }
)()
