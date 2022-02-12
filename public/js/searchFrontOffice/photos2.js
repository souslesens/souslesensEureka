var Photos = (function () {
    var self = {}

    self.hitPhoto = {}

    self.hitBordereau = {}

    self.currentHit;


    self.showPhotos = function (hit, displayConfig) {
        self.currentHit = hit
        self.initFotorama()


        var theque = appConfig.photos.indexPhotosDirsMap[hit._index]
        self.currentTheque = theque
        var sep = "_"
        if (theque == "phototheque")
            sep = "|"
        var regexSep = new RegExp("/" + sep + "/", "g")

        $("#photoMessageDiv").html("recherche des photos en cours...")
        self.getPhotosTree(hit, function (err, jstreeData) {

            if (err)
                return alert(err)

            if (jstreeData.length == 0) {
                $("#photoMessageDiv").html("Aucune  photo trouvée")
                $("#photosContainerDiv").css("display", "none")
                //$("#detailedDataPdfIframe").height('800px');
                $("#detailedDataPdfIframe").css("height", "95vh");
                return;
            }
            $("#photosContainerDiv").css("display", "block")
            $("#photoMessageDiv").html(jstreeData.length + " photos trouvées ")

            /*   var jstreeData = [];
               var existingNodes = {}
               photosPaths.forEach(function (path) {
                   var path = ""
                   for (var i = 0; i < 10; i++) {
                       var dir = path["dir" + (i + 1)]
                       if (!dir)
                           break;
                       path += dir + "/"


                   }


                   var array = path.split(sep)
                   //    array.splice(array.length-1,1)// delete photo from tree (keep only parents)
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
                       var path = "";
                       if (true || index > 0) {
                           var path = id.substring(2)
                       }

                       if (!existingNodes[id]) {
                           if (index == array.length - 1)
                               existingNodes[id] = 0
                           else {
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
                           }

                       } else {

                       }
                       oldId = id


                   })


               })

               var x = jstreeData;

               jstreeData.forEach(function (item) {
                   if (existingNodes[item.id] > 0)
                       item.text += " <b>" + existingNodes[item.id] + "</b>"
                   item.data.count = existingNodes[item.id]

               })*/


            var options = {
                selectTreeNodeFn: Photos.onTreeNodeSelect,
            }
            MyJsTree.loadJsTree("photosTreeDiv", jstreeData, options, function () {
                MyJsTree.openNodeDescendants("photosTreeDiv", "#", 2)

            })


        })


    }

    self.onTreeNodeSelect = function (event, obj) {
        var treePath = obj.node.id
        var files = obj.node.data.files;
        var rootPath = "/montageJungle/MiniaturesPhotos/"
        var photoPaths = []
        if (self.currentTheque == "phototheque") {
            rootPath = "/montageJungle/"
            files.forEach(function (file) {
                ///var/montageJungle/phototheque/INDEX/
              // var treePath2= treePath.replace(/\//g,"*/")
               var treePath2= treePath
                photoPaths.push({"thumb": rootPath + "Photo/" + "FONDS/" + treePath2 + file})
             //   photoPaths.push({"thumb": rootPath + "phototheque/" + "FONDS/" + treePath2 + file})
            })

        } else if (self.currentTheque == "polytheque") {

            files.forEach(function (file) {

                var rootPath = "/montageJungle/MiniaturesPhotos/"
                var treePath2 = (treePath).replace(/\//g, "|_|");//coding for pathSep

                photoPaths.push({"thumb": rootPath + "polytheque2" + "/" + treePath2 + file})
            })
        } else {

            files.forEach(function (file) {
                var rootPath = "/montageJungle/MiniaturesPhotos/"
                var treePath2 = (treePath).replace(/\//g, "|_|");//coding for pathSep

                photoPaths.push({"thumb": rootPath + self.currentTheque + "/_INDEX_" + treePath2 + file})
            })
        }

        console.log(JSON.stringify(photoPaths, null, 2))


        var fr = $('.fotorama').fotorama();
        var fotorama = fr.data('fotorama');
        if (fotorama) {
            fotorama.load(photoPaths);
            fotorama.show(0);
        } else {
            $('.fotorama').fotorama({data: photoPaths});
        }
    }
    self.initFotorama = function () {
        $(".fotorama").html("")
        $('.fotorama').on('fotorama:load', function (e, fotorama) {
            self.Fotorama = fotorama
        });
        $('.fotorama').on('fotorama:show', function (e, fotorama) {

            var activePhoto = fotorama.data[fotorama.activeIndex].thumb
            self.setActivePhotoInfos(activePhoto)

        });
        self.fotoramaDiv = $('.fotorama').fotorama();


    }


    self.setActivePhotoInfos = function (photoPath) {

        if (self.currentTheque == "phototheque") {
            var url = photoPath.replace("INDEX", "FONDS")
            var html = "<a href='" + url + "' target='_blank'>" + photoPath + "</a>"
            console.log(html);
            $("#activePhotoDiv").html(html)
            return;
        }
        var p = photoPath.indexOf("INDEX")//artotheque
        if (p > -1) {
            p += 5
            photoPath = photoPath.substring(p + 1).replace(/_/g, "/")
            var url = "/montageJungle/" + "Arto" + "/FONDS/" + photoPath
            var html = "<a href='" + url + "' target='_blank'>" + photoPath + "</a>"
            console.log(html);

        } else {
            var p = photoPath.indexOf("polytheque")
            if (p > -1) {
                p += 10
                photoPath = photoPath.substring(p + 1).replace(/\|_\|/g, "/")
                var url = "/montageJungle/" + "Poly/" + photoPath
                var html = "<a href='" + url + "' target='_blank'>" + photoPath + "</a>"
                console.log(html);
            } else {
                $("#activePhotoDiv").html(photoPath)
            }
        }

        $("#activePhotoDiv").html(html)
    }


    self.getPhotosTree = function (hit, callback) {
        var index = hit._index
        var photosArray = [];
        var options = {}
        if (index.indexOf("photos") == 0) {
            //PH0409002009
            options.pattern = [
                hit._source.indexCIJW.substring(2, 6),
                hit._source.indexCIJW.substring(6, 9),
                hit._source.indexCIJW.substring(9, 12)
            ]

            //  options.pattern = [hit._source.dossier, hit._source.sousdossier, hit._source.document]

        } else if (index == "bordereaux") {
            options.pattern = [hit._source.title.substring(0, 4)]
        } else if (index == "artotheque" || index == "arts") {

            var niveau2 = hit._source.collection.substring(0, 3)
            var niveau3 = hit._source.collection.substring(3)
            options.pattern = [hit._source.fonds, niveau2, niveau3, hit._source.document]

        } else {
            return callback(0, [])
        }


        var data = []
        var offset = 0;
        var size = 500;
        var mustArray = []
        options.pattern.forEach(function (item, index) {
            if(false) {
                mustArray.push({
                    "term": {
                        ["dir" + (index + 1) + ".keyword"]: item
                    }
                })
            }else{
                mustArray.push({
                    "match": {
                        ["dir" + (index + 1)]: item
                    }
                })
            }
        })
        var query = {
            "query": {
                "bool": {
                    "must": mustArray
                }
            }, "_source": {
                "excludes": [
                    "attachment.content"
                ]
            }
        }
        var resultSize = 1;
        var maxFiles = 2000
        var jstreeData = [];
        var existingNodes = {};
        async.whilst(
            function (callbackTest) {//test
                return resultSize > 0 && data.length < maxFiles;
            },

            function (callbackWhilst) {
                query.from = offset;
                query.size = size

                var strQuery = JSON.stringify(query,null,2);
                console.log(strQuery)
                var payload = {
                    executeQuery: strQuery,
                    indexes: JSON.stringify(["photos-catalog-" + self.currentTheque])

                }
                $.ajax({
                    type: "POST",
                    url: appConfig.elasticUrl,
                    data: payload,
                    dataType: "json",
                    success: function (result, textStatus, jqXHR) {
                        var hits = result.hits.hits;
                        resultSize = hits.length
                        offset += size;

                        hits.forEach(function (hit) {
                            var item = hit._source;
                            if (item.files && item.files.length > 0) {
                                var id = ""
                                var parent = ""
                                var label = ""
                                var previousId = "#"
                                for (var i = 0; i < 10; i++) {
                                    var dir = item["dir" + (i + 1)]
                                    if (!dir)
                                        break;
                                    parent = previousId
                                    id += dir + "/"
                                    if (i > 0) {
                                        previousId = id
                                    } else {
                                        previousId = "#"
                                    }

                                    label = dir

                                    label += " (" + item.files.length + ")"
                                    if (!existingNodes[id]) {
                                        existingNodes[id] = 1
                                        jstreeData.push({
                                            id: id,
                                            parent: parent,
                                            text: label,
                                            data: item


                                        })
                                    }
                                }
                                //  data.push(hit._source)
                            }
                        })

                        callbackWhilst()
                    },
                    error: function (err, textStatus, jqXHR) {
                        callbackWhilst(err)
                    }
                })


                /*   photosArray.dirPath = data.dirPath
                   self.currentPhotosDirPath = data.dirPath

                   self.currentDocumentPhotos = photosArray*/


            }, function (err) {

                return callback(null, jstreeData)

            })


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

