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

            if (err) {
                $("#waitImg").css("display", "none")
                return alert(err)
            }

            if (jstreeData.length == 0) {
                $("#photoMessageDiv").html("Aucune  photo trouvée")
                $("#photosContainerDiv").css("display", "none")
                //$("#detailedDataPdfIframe").height('800px');
                $("#detailedDataPdfIframe").css("height", "95vh");
                $("#waitImg").css("display", "none")
                return;
            }
            $("#photosContainerDiv").css("display", "block")
            $("#photoMessageDiv").html(jstreeData.totalPhotos+ " photos trouvées ")


            var options = {
                selectTreeNodeFn: Photos.onTreeNodeSelect,
            }
            MyJsTree.loadJsTree("photosTreeDiv", jstreeData, options, function () {
                MyJsTree.openNodeDescendants("photosTreeDiv", "#", 2)

            })


        })


    }

    self.onTreeNodeSelect = function (event, obj, useFonds) {
        $("#waitImg").css("display", "block")
        if (obj.node.children && obj.node.children > 0) {
            $("#waitImg").css("display", "none")
            return;
        }

        self.currentTreeNodeObj = obj
        var treePath = obj.node.id
        var files = obj.node.data.files;

        if (files.length == 0 || files.length > 100) {
            $("#waitImg").css("display", "none")
            return;
        }
        var rootPath = "/montageJungle/MiniaturesPhotos/"
        var photoPaths = []
        if (self.currentTheque == "phototheque") {
            rootPath = "/montageJungle/"
            files.forEach(function (file) {
                if(file.indexOf(".")==0)
                    return
                if (!useFonds) {
                    rootPath = "/montageJungle/"
                    var treePath2 = (treePath).replace(/\//g, "|_|");
                    photoPaths.push({"thumb": rootPath + "Poly/" + treePath2 + file})
                } else {
                    var treePath2 = treePath
                    photoPaths.push({"thumb": rootPath + "Photo/" + "FONDS/" + treePath2 + file})

                }
            })

        } else if (self.currentTheque == "polytheque") {
            files.forEach(function (file) {

                if (!useFonds) {
                    var rootPath = "/montageJungle/MiniaturesPhotos/"
                    var treePath2 = (treePath).replace(/\//g, "|_|");//coding for pathSep
                    photoPaths.push({"thumb": rootPath + "polytheque2" + "/" + treePath2 + file})
                } else {
                    rootPath = "/montageJungle/"
                    var treePath2 = treePath
                    photoPaths.push({"thumb": rootPath + "Poly/" + treePath2 + file})
                }
            })
        } else if (self.currentTheque == "artotheque") {

            files.forEach(function (file) {
                if (!useFonds) {
                    var rootPath = "/montageJungle/MiniaturesPhotos/"
                    var treePath2 = (treePath).replace(/\//g, "_");//coding for pathSep
                    photoPaths.push({"thumb": rootPath + self.currentTheque + "/_INDEX_" + treePath2 + file})
                } else {
                    rootPath = "/montageJungle/"
                    var treePath2 = treePath
                    photoPaths.push({"thumb": rootPath + "Poly/" + "FONDS/" + treePath2 + file})
                }
            })
        }

        self.checkPhotoExists(photoPaths[0].thumb, function(photo1Exists){

            if(photo1Exists || useFonds){
                var fr = $('.fotorama').fotorama();
                var fotorama = fr.data('fotorama');
                if (fotorama) {

                    fotorama.load(photoPaths.slice(0,1));


                    fotorama.load(photoPaths);
                    // fotorama.show(0);
                } else {
                    $('.fotorama').fotorama({data: photoPaths});
                }
            }else{
                self.onTreeNodeSelect(null, self.currentTreeNodeObj, true)
            }

        })


     //   console.log(JSON.stringify(photoPaths, null, 2))




    }
    self.initFotorama = function () {
        $(".fotorama").html("")
        $('.fotorama').on('fotorama:load', function (e, fotorama) {
            $("#waitImg").css("display", "none")
            self.imgsLoaded= true
            self.Fotorama = fotorama
        });
        $('.fotorama').on('fotorama:show', function (e, fotorama) {

            var activePhoto = fotorama.data[fotorama.activeIndex].thumb
            self.setActivePhotoInfos(activePhoto)

        });
        $('.fotorama').on('fotorama:error', function (e, fotorama, xxx) {
            $("#waitImg").css("display", "none")
         /*   if (!self.isUsingFonds) {
                self.isUsingFonds = true
                fotorama.destroy()
                self.onTreeNodeSelect(null, self.currentTreeNodeObj, true)
                self.isUsingFonds = false
            }*/


        });

        self.fotoramaDiv = $('.fotorama').fotorama();


    }

    self.checkPhotoExists=function(path, callback){
        var img = new Image();
        $(img).load(function(){
            return callback(true);
        }).attr({
            src: path
        }).error(function(){
           return callback(false);
        });
    }


    self.setActivePhotoInfos = function (photoPath) {


        function uriEncodePhotoPath(photoPath) {


            return photoPath.replace(/'/g,"%27")
            var array = photoPath.split("/")
            var encodedPhotoPath = ""
            array.forEach(function (item, index) {
                if (index > 0)
                    encodedPhotoPath += "/"
                encodedPhotoPath += encodeURI(item)

            })
            return encodedPhotoPath
        }


        if (self.currentTheque == "phototheque") {
            var url = photoPath.replace("INDEX", "FONDS")
            url=uriEncodePhotoPath(url)
            var html = "<a href='" + url + "' target='_blank'>" + photoPath + "</a>"
           // console.log(html);
            $("#activePhotoDiv").html(html)
            return;
        }
        var p = photoPath.indexOf("INDEX")//artotheque
        if (p > -1) {
            p += 5
            photoPath = photoPath.substring(p + 1).replace(/_/g, "/")
            var url = "/montageJungle/" + "Arto" + "/FONDS/" + photoPath
            url=uriEncodePhotoPath(url)
            var html = "<a href='" + url + "' target='_blank'>" + photoPath + "</a>"
           // console.log(html);

        } else {
            var p = photoPath.indexOf("polytheque")
            if (p > -1) {
                p += 10
                photoPath = photoPath.substring(p + 1).replace(/\|_\|/g, "/")
                var url = "/montageJungle/" + "Poly/" + photoPath
                url=uriEncodePhotoPath(url)
                var html = "<a href='" + url + "' target='_blank'>" + photoPath + "</a>"
                console.log(html);
            } else {
                $("#activePhotoDiv").html(photoPath)
            }
        }

        $("#activePhotoDiv").html(html)
    }


    self.getPhotosTree = function (hit, callback) {
        $("#waitImg").css("display", "block")
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
        } else if (index == "arkotheque1") {
            var array=hit._source.cote.split(" ")
            options.pattern = [array[1]]
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
            if (true) {
                mustArray.push({
                    "term": {
                        ["num_dir" + (index + 1) + ""]: item
                    }
                })
            } else {
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
        var maxFiles = 200000
        var jstreeData = [];
        var existingNodes = {};
        var totalPhotos=0
        async.whilst(
            function (callbackTest) {//test
                return resultSize > 0 && data.length < maxFiles;
            },

            function (callbackWhilst) {
                query.from = offset;
                query.size = size

                var strQuery = JSON.stringify(query, null, 2);
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
                                totalPhotos+=item.files.length
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
jstreeData.totalPhotos=totalPhotos;
                $("#waitImg").css("display", "none")
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

