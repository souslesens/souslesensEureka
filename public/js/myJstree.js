
var MyJsTree={

        types: {
            "tool": {
                "icon": "../icons/tool.png",

            },
            "SKOS": {
                "icon": "../icons/thesaurus.png",

            },
            "OWL": {
                "icon": "../icons/ontology.png"
            },

            "class": {
                "icon": "../icons/class.png"
            }
        ,
            "concept": {
                "icon": "../icons/concept.png"
            },
            "collection": {
                "icon": "../icons/collection.png"
            },
            "default": {
                "icon": "../icons/default.png"
            },
            "owl:Class": {
                "li_attr": {style: "color:black"},
                "icon": "../icons/class.png",

            },
            "owl:ObjectProperty": {
                "icon": "../icons/property.png"
            },
            "owl:Restriction": {
                "icon": "../icons/restriction.png"
            },
            "owl:table": {
                "icon": "../icons/table.png"
            },
            "importedClass": {
                "li_attr": {style: "color:#ccc"},
                "icon": "../icons/externalObject.png"
            },
            "importedProperty": {
                "li_attr": {style: "color:#ccc"},
                "icon": "../icons/externalObject.png"
            },
            "importedRestriction": {
                "li_attr": {style: "color:#ccc"},
                "icon": "../icons/externalObject.png"
            },

        },
        loadJsTree: function (jstreeDiv, jstreeData, options, callback) {
            var jstreeData2 = [];
            jstreeData.forEach(function (item) {
                if (item.parent != item.id)
                    jstreeData2.push(item)
            })
            jstreeData = jstreeData2


            if (!options)
                options = {}

            var plugins = [];
            if (!options.cascade)
                options.cascade = "xxx"
            if (options.selectDescendants)
                options.cascade = "down"
            if (options.withCheckboxes)
                plugins.push("checkbox")
            if (options.searchPlugin)
                plugins.push("search")


            if (options.contextMenu) {
                // $(".jstree-contextmenu").css("z-index",100)
                plugins.push("contextmenu")
            }
            if (options.dnd)
                plugins.push("dnd")
            if (true || options.types) {
                plugins.push("types")

            }


            var check_callbackFn = function (op, node, parent, position, more) {
                if (op == 'move_node' && options.dropAllowedFn) {
                    return options.dropAllowedFn(op, node, parent, position, more)
                } else {
                    return true;
                }
            }


            if ($('#' + jstreeDiv).jstree)
                $('#' + jstreeDiv).jstree("destroy")
            $('#' + jstreeDiv).jstree({

                /* "checkbox": {
                     "keep_selected_style": false
                 },*/
                "plugins": plugins,
                "core": {
                    'data': jstreeData,
                    'check_callback': check_callbackFn
                },
                'dnd': options.dnd,
                "search": options.searchPlugin,
                "checkbox": {
                    tie_selection: false,
                    whole_node: false
                },
                types: MyJsTree.types,

                contextmenu: {items: options.contextMenu}


            }).on('loaded.jstree', function () {

                if (options.openAll)
                    $('#' + jstreeDiv).jstree(true).open_all();
               MyJsTree.setTreeAppearance()
                if (!options.doNotAdjustDimensions)
                    MyJsTree.setTreeParentDivDimensions(jstreeDiv)
                if (callback)
                    callback();


            }).on("select_node.jstree",
                function (evt, obj) {

                    if (options.selectTreeNodeFn)
                        options.selectTreeNodeFn(evt, obj);
                }).on('open_node.jstree', function (evt, obj) {
               MyJsTree.setTreeAppearance()
                if (options.onOpenNodeFn) {
                    options.onOpenNodeFn(evt, obj);
                }

            }).on("check_node.jstree", function (evt, obj) {

                if (options.onCheckNodeFn) {
                    options.onCheckNodeFn(evt, obj);
                }


            }).on("uncheck_node.jstree", function (evt, obj) {


                if (options.onUncheckNodeFn) {
                    options.onUncheckNodeFn(evt, obj);
                }


            }).on("create_node.jstree", function (parent, node, position) {
                if (options.onCreateNodeFn) {
                    options.onCreateNodeFn(parent, node, position)
                   MyJsTree.setTreeAppearance()
                }
            }).on("delete_node.jstree", function (node, parent) {
                if (options.deleteNodeFn) {
                    options.deleteNodeFn(node, parent)
                   MyJsTree.setTreeAppearance()
                }
            })
                .on("move_node.jstree", function (node, parent, position, oldParent, oldPosition, is_multi, old_instance, new_instance) {
                    if (options.onMoveNodeFn) {
                        options.onMoveNodeFn(node, parent, position, oldParent, oldPosition, is_multi, old_instance, new_instance);
                       MyJsTree.setTreeAppearance()
                    }

                })
                .on("show_contextmenu", function (node, x, y) {
                    if (options.onShowContextMenu)
                        options.onShowContextMenu(node, x, y)
                });


            if (options.dnd) {
                if (options.dnd.drag_start) {
                    $(document).on('dnd_start.vakata', function (data, element, helper, event) {
                        options.dnd.drag_start(data, element, helper, event)
                    });
                }
                if (options.dnd.drag_move) {
                    $(document).on('dnd_move.vakata Event', function (data, element, helper, event) {
                        options.dnd.drag_move(data, element, helper, event)
                    });
                }
                if (options.dnd.drag_stop) {
                    $(document).on('dnd_stop.vakata Event', function (data, element, helper, event) {
                        options.dnd.drag_stop(data, element, helper, event)
                    });
                }
            }
            if(options.ondblclickFn) {
                $('#' + jstreeDiv+ ' a').on('dblclick', function (e) {
                    var node = $(e.target).closest("li");
                    var type = node.attr('rel');
                    var item = node[0].id;
                    options.ondblclickFn(item)
                    // do stuff...
                });
            }


        },
        clear: function (jstreeDiv) {
            $("#" + jstreeDiv).jstree("destroy").empty();
        },

        addNodesToJstree: function (jstreeDiv, parentNodeId, jstreeData, options) {
            if (!options)
                options = {}
            var position = "first"
            if (options.positionLast)
                position = "last"
            jstreeData.forEach(function (node) {
                var parentNode = parentNodeId;

                if (node.parent)
                    parentNode = node.parent;
                if (!parentNode)
                    return;

                $("#" + jstreeDiv).jstree(true).create_node(parentNode, node, position, function () {
                    $("#" + jstreeDiv).jstree(true).open_node(parentNode, null, 500);

                })

            })
            setTimeout(function () {
               MyJsTree.setTreeAppearance()
                //   $("#" + jstreeDiv).jstree(true).close_node(parentNodeId);

                var offset = $(document.getElementById(parentNodeId)).offset();
            }, 500)
        },

        deleteNode: function (jstreeDiv, nodeId) {
            $("#" + jstreeDiv).jstree(true).delete_node(nodeId)
           MyJsTree.setTreeAppearance()
        },
        deleteBranch: function (jstreeDiv, nodeId, deleteNodeItself) {
            var descendants =MyJsTree.getNodeDescendants(jstreeDiv, nodeId, null, true);
            if (deleteNodeItself) {
                if (descendants.indexOf(nodeId) < 0)
                    descendants.push(nodeId)
            } else {
                var index = descendants.indexOf(nodeId);
                if (index > -1) {
                    descendants.splice(index, 1);
                }
            }
            $("#" + jstreeDiv).jstree(true).delete_node(descendants)

        },
        getjsTreeNodes: function (jstreeDiv, IdsOnly, parentNodeId) {
            if (!parentNodeId)
                parentNodeId = "#"
            var idList = [];
            var jsonNodes = $('#' + jstreeDiv).jstree(true).get_json(parentNodeId, {flat: true});
            if (IdsOnly) {
                jsonNodes.forEach(function (item) {
                    idList.push(item.id)
                })
                return idList
            } else {
                return jsonNodes;
            }

        },

        getjsTreeNodeObj: function (jstreeDiv, id) {
            return $('#' + jstreeDiv).jstree(true).get_node(id);

        },

        getNodeDescendants: function (jstreeDiv, nodeId, depth, onlyIds) {
            var nodes = [];
            var nodeIdsMap = {};
            var currentLevel = 0
            var recurse = function (nodeId) {
                if (depth && (currentLevel++) > depth)
                    return;

                var node = $('#' + jstreeDiv).jstree(true).get_node(nodeId);
                if (!nodeIdsMap[nodeId]) {
                    nodeIdsMap[nodeId] = 1
                    if (onlyIds)
                        nodes.push(node.id);
                    else
                        nodes.push(node);

                    // Attempt to traverse if the node has children
                    if (node.children) {
                        node.children.forEach(function (child) {
                            recurse(child);

                        })
                    }
                }
            }
            recurse(nodeId);

            return nodes
        },
        openNodeDescendants: function (jstreeDiv, nodeId, depth) {
            var descendants = MyJsTree.getNodeDescendants(jstreeDiv, nodeId, depth);
            $("#" + jstreeDiv).jstree().open_node(descendants)
        },

        setTreeParentDivDimensions: function (jstreeDiv) {
//$("#"+jstreeDiv).addClass("jstreeParent")
            var p = $("#" + jstreeDiv).offset();
            if (p.top > 200)//in case jstreeDiv in inactive tab
                p.top = 200
            var h = $(window).height() - p.top - 50
            var w;
            if (p.left < 600)
                w = 380;
            else
                w = 340
            $("#" + jstreeDiv).width(w)
            $("#" + jstreeDiv).height(h)
            $("#" + jstreeDiv).css('overflow', 'auto')
            $("#" + jstreeDiv).css('margin-top', '5px')
            if (false && p.left < 600)
                $("#" + jstreeDiv).css('margin-left', '-25px')


        },


        setTreeAppearance: function () {
            return;
            $(".jstree-themeicon").css("display", "none")
            $(".jstree-anchor").css("line-height", "18px")
            $(".jstree-anchor").css("height", "18px")
            $(".jstree-anchor").css("font-size", "14px")

        },
        onAllTreeCbxChange: function (allCBX, jstreeDiv) {
            var checked = $(allCBX).prop("checked")
            if (checked) {
                $("#" + jstreeDiv).jstree(true).check_all()
            } else {
                $("#" + jstreeDiv).jstree(true).uncheck_all()
            }
        }
    ,
        checkAll: function (jstreeDiv) {
            $("#" + jstreeDiv).jstree().check_all()
        },
        openNode: function (jstreeDiv, nodeId) {
            $("#" + jstreeDiv).jstree().open_node(nodeId)
        }




}