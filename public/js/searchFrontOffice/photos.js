var Photos = (function () {
    var self = {}

    self.hitPhoto = {}

    self.hitBordereau = {}

    self.currentHit;


    self.showPhotos = function (hit, displayConfig) {
        self.currentHit = hit
        self.initFotorama()


        var theque = appConfig.photos.indexPhotosDirsMap[hit._index]
        var sep = "_"
        if (theque == "phototheque")
            sep = "|"
        var regexSep = new RegExp("/" + sep + "/", "g")

        $("#photoMessageDiv").html("recherche des photos en cours...")
        self.getPhotos(hit, function (err, photosPaths) {


            if (err)
                return alert(err)

            if (photosPaths.length == 0) {
                $("#photoMessageDiv").html("Aucune  photos trouvées")
                $("#photosContainerDiv").css("display", "none")
                //$("#detailedDataPdfIframe").height('800px');
                   $("#detailedDataPdfIframe").css("height","95vh");
                return;
            }
            $("#photosContainerDiv").css("display", "block")
            $("#photoMessageDiv").html(photosPaths.length + " photos trouvées ")

            var jstreeData = [];
            var existingNodes = {}
            photosPaths.forEach(function (path) {
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
                        if(index==array.length-1)
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
                item.data.count=existingNodes[item.id]

            })


            var options = {
                selectTreeNodeFn: Photos.onTreeNodeSelect,
            }
            MyJsTree.loadJsTree("photosTreeDiv", jstreeData, options, function () {
                MyJsTree.openNodeDescendants("photosTreeDiv", "#", 2)

            })


        })


    }

    self.onTreeNodeSelect = function (event, obj) {

        if(obj.node.data.count>appConfig.photos.maxPhotosInFotorama && obj.node.children.length>0)
            return alert("Trop de photos à charger : "+obj.node.data.count+" .Selectionnez un niveau plus bas ")

        var subPath = obj.node.data.path
        var theque = obj.node.data.theque
        self.currentTheque=theque

        var rootUrl = ""
        var sep;


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
            var url = "/montageJungle/" + self.currentTheque + "/FONDS/" + photoPath
            var html = "<a href='" + url + "' target='_blank'>" + photoPath + "</a>"
            console.log(html);

        } else {
            var p = photoPath.indexOf("polytheque")
            if (p > -1) {
                p += 10
                photoPath = photoPath.substring(p + 1).replace(/_/g, "/")
                var url = "/montageJungle/" + self.currentTheque + photoPath
                var html = "<a href='" + url + "' target='_blank'>" + photoPath + "</a>"
                console.log(html);
            } else {
                $("#activePhotoDiv").html(photoPath)
            }
        }

        $("#activePhotoDiv").html(html)
    }



  self.setActivePhotoInfosXX = function (photoPath) {
        if (self.currentTheque == "phototheque") {
            var url = photoPath.replace("INDEX", "FONDS")
            var html = "<a href='" + url + "' target='photos'>" + photoPath + "</a>"
            console.log(html);
            $("#activePhotoDiv").html(html)
            return;
        }
        var p = photoPath.indexOf("INDEX")//artotheque
        if (p > -1) {
            p += 5
            photoPath = photoPath.substring(p + 1).replace(/_/g, "/")
        } else {
            var p = photoPath.indexOf("polytheque")
            if (p > -1) {
                p += 10
                photoPath = photoPath.substring(p + 1).replace(/_/g, "/")
            } else {
                $("#activePhotoDiv").html(photoPath)
            }
        }
        var url = "/montageJungle/" + self.currentTheque + "/FONDS/" + photoPath
        var html = "<a href='" + url + "' target='photos'>" + photoPath + "</a>"
        console.log(html);
        $("#activePhotoDiv").html(html)
    }









    self.getPhotos = function (hit, callback) {
        var index = hit._index
        var photosArray = [];
        var options = {}
        if (index.indexOf("photos") == 0) {
            //PH0409002009
            options.pattern =[
                hit._source.indexCIJW.substring(2,6),
                hit._source.indexCIJW.substring(6,9),
                hit._source.indexCIJW.substring(9,12)
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
                //  $('.fotorama').html("no photos found")
                return callback(err);
            }
        });
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

