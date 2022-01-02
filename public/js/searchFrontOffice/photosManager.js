

var PhotosManager = (function () {
    var self = {}
    /* self.photosDir = "/var/lib/nodejs/souslesensEureka/public/Photo/"
     self.photosRootUrl = "/data/photos/IndexPhotos/"*/

    self.photosDir = "/var/lib/nodejs/souslesensEureka/public/Photo/"
    self.photosDir = "/var/lib/nodejs/souslesensEureka/public/Photo/"
    var os = navigator.platform;
    var sep = "/"
    if (false && os.indexOf("Win") == 0) {
        sep = "\\"
        self.photosDir = "D:\\webstorm\\souslesensEureka\\public\\Photo\\"
    }
    self.photosRootUrl = "/Photo/"

    self.showData = function (hit) {

        var leftDivFields = ["date", "lieu", "photographe", "description"]
        var rightDivFields = ["indexCIJW", "contenu", "droit_auteur", "droit_image","temoin_ref"]

        var data = hit._source
        var html = "<table>"
        leftDivFields.forEach(function (field) {
            html += "<tr>"
            html += "<td  class='tdBold'>" + field + "</td>"
            var value = ""

            if(field=="date" && data[field]){
                data[field]=  data[field].substring(0,4)
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

        if (true || (data.indexCIJW && data.indexCIJW.indexOf("PH") == 0)) {
            var photosArray = [];


            $('.fotorama').on('fotorama:load', function (e, fotorama) {
                self.Fotorama=fotorama

            });
            $('.fotorama').on('fotorama:show', function (e, fotorama) {
                console.log(e.type, fotorama.activeIndex);
                var activePhoto = fotorama.data[fotorama.activeIndex].thumb
                activePhoto = activePhoto.substring(activePhoto.lastIndexOf(sep) + 1)
                $("#activePhotoDiv").html(activePhoto)
            });



            var index = hit._index
            if (index == "photos") {
                var photoPath = data.dossier + "/" + data.sousdossier + "/" + data.document + "/";
                var photosRootUrl = self.photosRootUrl + photoPath
                var payload = {getPhotosFromDir: self.photosDir + photoPath}
                $.ajax({
                    type: "POST",
                    url: appConfig.elasticUrl,
                    data: payload,
                    dataType: "json",
                    success: function (data, textStatus, jqXHR) {
                        var index = data.realPath.indexOf(sep + "Photo")
                        var path = data.realPath.substring(index);

                        data.files.forEach(function (item) {
                            photosArray.push({"thumb": path + item})
                        })
                        $('.fotorama').fotorama({
                            data: photosArray
                        });
                    }
                    , error: function (err) {
                        console.log(err.responseText)
                        $('.fotorama').html("no photos found")
                    }
                });

            } else if (index == "bordereaux") {

                var docTitle=hit._source.title;
                var payload = {getPhotosList:docTitle,index}
                $.ajax({
                    type: "POST",
                    url: appConfig.elasticUrl,
                    data: payload,
                    dataType: "json",
                    success: function (data, textStatus, jqXHR) {


                        data.files.forEach(function (item) {
                            photosArray.push({"thumb":  item})
                        })
                        $('.fotorama').fotorama({
                            data: photosArray
                        });
                    }
                    , error: function (err) {
                        console.log(err.responseText)
                        $('.fotorama').html("no photos found")
                    }
                });
            }


        }








    }




    return self;


})()

