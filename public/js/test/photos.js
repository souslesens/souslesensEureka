var TestPhotos = (function () {
    var self = {}



   /* self.displayConfig = [
        {
            "attachment.title": {
                "cssClass": "text"
            }
        },
        {
            "attachment.date": {
                "cssClass": "text"
            }
        },
        {
            "attachment.language": {
                "cssClass": "text"
            }
        },
        {
            "title": {
                "cssClass": "excerpt"
            }
        },
        {
            "attachment.content": {
                "cssClass": "text"
            }
        }
    ]*/

    /*var paths=[]
    data.files.forEach(function(item){
        paths.push(item.replace(/_/g,"/"))
    })*/


    self.showHitDetails = function (hit, displayConfig, hasPhotos) {

        initFotorama = function () {

            var photosArray = [];
            $('.fotorama').on('fotorama:load', function (e, fotorama) {
                self.Fotorama = fotorama
            });
            $('.fotorama').on('fotorama:show', function (e, fotorama) {
                console.log(e.type, fotorama.activeIndex);
                var activePhoto = fotorama.data[fotorama.activeIndex].thumb
                activePhoto = activePhoto.substring(activePhoto.lastIndexOf(sep) + 1)
                $("#activePhotoDiv").html(activePhoto)
            });


        }

        setHtmlContent_photo = function (hit) {
            var leftDivFields = ["date", "lieu", "photographe", "description"]
            var rightDivFields = ["indexCIJW", "contenu", "droit_auteur", "droit_image", "temoin_ref"]

            var data = hit._source
            var html = "<table>"
            leftDivFields.forEach(function (field) {
                html += "<tr>"
                html += "<td  class='tdBold'>" + field + "</td>"
                var value = ""

                if (field == "date" && data[field]) {
                    data[field] = data[field].substring(0, 4)
                }
                if (data[field])
                    value = data[field]
                html += "<td>" + value + "</td>"
                html += "</tr>"
            })
            html += "</html>"
            $("#datailedDataDivLeft").html(html)

            var html = "<table>"
            rightDivFields.forEach(function (field) {
                html += "<tr>"
                html += "<td class='tdBold'>" + field + "</td>"
                var value = ""
                if (data[field])
                    value = data[field]
                html += "<td>" + value + "</td>"
                html += "</tr>"
            })
            html += "</html>"
            $("#datailedDataDivRight").html(html)

        }

        getHtmlContent_generic = function (hit, displayConfig) {

            if (!displayConfig || displayConfig.length == 0 && template == "details") {
                delete hit._source["attachment.content"]
                return JSON.stringify(hit._source, null, 2).replace(/\n/g, "<br>")
            }
            var words = []
            var appConfig = {}
            var template = "details"
            if (false && context !== undefined) {
                var words = self.getQuestionWords(context.question);
            }
            var html = "";
            displayConfig.forEach(function (line) {


                var fieldName = Object.keys(line)[0];
                var fieldLabel = line[fieldName]["label" + appConfig.locale] || fieldName;
                var fieldValue;
                if (fieldName.indexOf(".") > -1) {// when fields are objects (attachment.content...)
                    var subFields = fieldName.split(".")
                    fieldValue = null;
                    subFields.forEach(function (field) {
                        if (!fieldValue)
                            fieldValue = hit._source[field];
                        else
                            fieldValue = fieldValue[field]
                    })

                } else {
                    fieldValue = hit._source[fieldName];
                }


                fieldValue = fieldValue || "";
                if (fieldValue.replace) {
                    fieldValue = fieldValue.replace(/\n{2}/gm, "<br>")
                    fieldValue = fieldValue.replace(/\n/gm, "<br>")
                    //format date
                    fieldValue = fieldValue.replace(/(\d{4})-(\d{2})-(\d{2}).*Z/, function (a, year, month, day) {
                        if (appConfig.locale == "Fr")
                            return "" + day + "/" + month + "/" + year
                        return "" + year + "/" + month + "/" + day
                    })
                }
                if (false && (template == "details" || [fieldName].highlightWords)) {
                    fieldValue = self.setHighlight(fieldValue, words);
                }

                if (line[fieldName].hyperlink) {
                    fieldValue = "<a href='" + fieldValue + "'>" + "cliquez ici" + "</a>"
                }


                var cssClass = line[fieldName].cssClass;

                if (!cssClass)
                    cssClass = "";


                if (template == "details") {
                    fieldValue = "<span class='" + template + "'>" + fieldValue + "</span>";
                    html += "<B>" + fieldLabel + " : </B>" + fieldValue + "<hr>";
                } else {
                    fieldValue = "<span class='" + template + " " + cssClass + "'><b>" + fieldValue + "</b></span>";
                    html += fieldValue + "&nbsp;&nbsp;";
                }


            })
            if (hit.highlight) {// traitement special
                html += "<span class='excerpt'>";
                hit.highlight[appConfig.contentField].forEach(function (highlight, index) {
                    if (index > 0)
                        html += "  ...  "
                    html += highlight
                })
                html += "<span>"
            }
            return html

        }


        getPhotos = function (hit, callback) {
            if (hit._index.indexOf("bordereau") == 0) {
                var title = hit._source.title;
                var docNumber = title.substring(0, 4)

                var photos = []
                //replace by query to photoManager
                self.dataPolytheque.files.forEach(function (item) {
                    if (item.indexOf("/" + docNumber) > -1)
                        photos.push(item)

                })

                return callback(null, photos)
            } else if (hit._index.indexOf("photo") == 0) {
            }
        }


        var index = hit._index


        if (hasPhotos) {
            /// initFotorama()

            getPhotos(hit, function (err, photosPaths) {
                if (err)
                    return alert(err)

                var jstreeData = [];
                var existingNodes = {}
                //generate tree
                photosPaths.forEach(function (path) {
                    var array = path.split("_")
                    self.currentPhotosRootUrl=array[0]
                    var oldId = "";
                    array.forEach(function (item, index) {
                        if (index == 0)
                            return;

                        var parent = "#"
                        if (index > 1) {
                            parent = oldId
                            existingNodes[parent] += 1
                        }
                        var id = parent + "_" + item;//common.getRandomHexaId(8)
                        var path=id.substring(1).replace(/_/g,"/")
                        if (!existingNodes[id]) {
                            existingNodes[id] = 0
                            item.id = id
                            jstreeData.push({
                                id: id,
                                text: item,
                                parent: parent,
                                data:{path:path}
                            })

                        } else {

                        }
                        oldId = id


                    })


                })

                var x = jstreeData;

                jstreeData.forEach(function (item) {
                    if (existingNodes[item.id] > 0)
                        item.text += " <b>" + existingNodes[item.id] + "</b>"

                })


                if (index == "photos") {
                    setHtmlContent_photo(hit)
                } else {
                    var html = getHtmlContent_generic(hit, displayConfig)
                    $("#detailedDataDivLeft").html(html)
                    var options = {
                        selectTreeNodeFn: TestPhotos.onTreeNodeSelect,
                    }
                    MyJsTree.loadJsTree("photosTreeDiv", jstreeData, options, function () {
                        MyJsTree.openNodeDescendants("photosTreeDiv", "#", 2)

                    })

                }
            })
        } else {
            $("#photosContainerDiv").html("pas de photos")
            // $("#photosContainerDiv").css("display","none")
        }


    }
    self.onTreeNodeSelect = function (event, obj) {
 var subPath=obj.node.data.path

       var path=self.currentPhotosRootUrl+subPath
    }

    return self;

})()






