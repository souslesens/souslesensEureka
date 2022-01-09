var Photos = (function () {
    var self = {}


    // self.dataPolytheque = {}


    self.hitPhoto = {}

    self.hitBordereau = {}

    self.currentHit;
    self.initFotorama = function () {
        $(".fotorama").html("")
        $('.fotorama').on('fotorama:load', function (e, fotorama) {
            self.Fotorama = fotorama
        });
        $('.fotorama').on('fotorama:show', function (e, fotorama) {
            console.log(e.type, fotorama.activeIndex);
            var activePhoto = fotorama.data[fotorama.activeIndex].thumb
            //  activePhoto = activePhoto.substring(activePhoto.lastIndexOf(sep) + 1)
            activePhoto = activePhoto.replace("/Photos/INDEXES/polytheque/", "")
            $("#activePhotoDiv").html(activePhoto)
        });
        self.fotoramaDiv = $('.fotorama').fotorama();


    }
    self.getPhotos = function (hit, callback) {
        var index = hit._index
        var photosArray = [];
        var options = {}
        if (index.indexOf("photos") == 0) {
            options.pattern = [hit._source.dossier,hit._source.sousdossier,hit._source.document]

        } else if (index == "bordereaux") {
            options.pattern = [hit._source.title.substring(0, 4)]
        } else if (index == "artotheque") {
            var niveau2=hit._source.collection.substring(0,2)
            var niveau3=hit._source.collection.substring(2)
            options.pattern = [hit._source.fonds,niveau2,niveau3,hit._source.document]

        } else {
            return callback("no photo")
        }

        var photosDir = appConfig.photos.indexPhotosDirsMap[index]

        var docTitle = hit._source.title;
        var payload = {getPhotosList: 1, options: JSON.stringify(options), photosDir: photosDir}
        $.ajax({
            type: "POST",
            url: appConfig.elasticUrl,
            data: payload,
            dataType: "json",
            success: function (data, textStatus, jqXHR) {

                photosArray = data.files;
                photosArray.dirPath = data.dirPath
                self.currentPhotosDirPath = data.dirPath

                self.currentDocumentPhotos = photosArray
                return callback(null, photosArray)
            }
            , error: function (err) {
                console.log(err.responseText)
                $('.fotorama').html("no photos found")
                return callback(err);
            }
        });
    }

    self.setHtmlContent_photo = function (hit) {
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

    self.getHtmlContent_generic = function (hit, displayConfig) {

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
        var htmlLeft = "";
        var htmlRight = "";
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

            if (fieldLabel == "attachment.content") {
                var str = fieldValue.replace(/<br>/g, "\r")
                fieldValue = "<textarea id='attachmentContentTA'>" + fieldValue + "</textarea>"
            }

            if (template == "details") {
                fieldValue = "<span class='" + template + "'>" + fieldValue + "</span>";
                var html_ = "<B>" + fieldLabel + " : </B>" + fieldValue + "<hr>";
                if (fieldLabel == "attachment.content")
                    htmlLeft += html_
                else
                    htmlRight += html_
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
        return {html: html, htmlLeft: htmlLeft, htmlRight: htmlRight};

    }

    self.showHitDetails = function (hit, displayConfig) {
        self.currentHit = hit
        self.initFotorama()


        var theque = appConfig.photos.indexPhotosDirsMap[hit._index]
        var sep = "_"
        if (theque == "phototheque")
            sep = "|"
        var regexSep = new RegExp("/" + sep + "/", "g")

        self.getPhotos(hit, function (err, photosPaths) {
            if (err)
                return alert(err)

            var jstreeData = [];
            var existingNodes = {}
            photosPaths.forEach(function (path) {
                var array = path.split(sep)
                self.currentPhotosRootUrl = array[0]
                var oldId = "";
                array.forEach(function (item, index) {
                    if (false && index == 0)
                        return;
                    var parent = "#"
                    if (index > 0) {
                        parent = oldId
                        existingNodes[parent] += 1
                    }
                    var id = parent + "_" + item;
                    var path="";
                    if (true || index > 0) {
                        var path = id.substring(2)
                    }

                    if (!existingNodes[id]) {
                        existingNodes[id] = 0
                        item.id = id
                        jstreeData.push({
                            id: id,
                            text: item,
                            parent: parent,
                            data: {
                                path: path,
                                text: item,
                                theque: theque
                            }
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

            var displayConfig = context.indexConfigs[hit._index].display;
            if (false && hit._index == "photos") {
                self.setHtmlContent_photo(hit)
            } else {
                var htmlObj = self.getHtmlContent_generic(hit, displayConfig)
                $("#detailedDataDivLeft").html(htmlObj.htmlLeft)
                $("#detailedDataDivRight").html(htmlObj.htmlRight)
                var options = {
                    selectTreeNodeFn: Photos.onTreeNodeSelect,
                }
                MyJsTree.loadJsTree("photosTreeDiv", jstreeData, options, function () {
                    MyJsTree.openNodeDescendants("photosTreeDiv", "#", 2)

                })

            }
        })


    }
    self.onTreeNodeSelect = function (event, obj) {
        var subPath = obj.node.data.path
        var theque = obj.node.data.theque

        var rootUrl = ""
        var sep ;



        var photosSubset = []
        if (!self.currentDocumentPhotos)
            alert("no  self.currentDocumentPhotos")
        self.currentDocumentPhotos.forEach(function (photo) {
            if (theque == "phototheque") {
                photo = photo.replace(/\|/g, "/")
                rootUrl = "/montageJungle/phototheque/INDEX/"
                photosSubset.push({"thumb": rootUrl + photo})
            } else {

                if (photo.indexOf(subPath) > -1) {
                    rootUrl = "/miniaturesPhotos/" + theque + "/"
                    photosSubset.push({"thumb": rootUrl + photo})
                }
            }
        })
      //  console.log( JSON.stringify(photosSubset,null,2))
        var fr = $('.fotorama').fotorama();
        var fotorama = fr.data('fotorama');
        if (fotorama) {
            fotorama.load(photosSubset);
            fotorama.show(0);
        } else {
            $('.fotorama').fotorama({data: photosSubset});
        }
    }


    function scrollTo(textarea, offset) {
        const txt = textarea.value;
        if (offset >= txt.length || offset < 0)
            return;
        textarea.scrollTop = 0;  // Important, so that scrollHeight will be adjusted
        textarea.value = txt.substring(0, offset);
        const height = textarea.scrollHeight;
        textarea.value = txt;
        textarea.scrollTop = height - 40;  // Margin between selection and top of viewport
    }


    return self;

})
()







