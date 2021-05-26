var PhotosManager = (function () {
    var self = {}
   /* self.photosDir = "/var/lib/nodejs/souslesensEureka/public/data/photos/IndexPhotos/"
    self.photosRootUrl = "/data/photos/IndexPhotos/"*/

    self.photosDir = "/var/lib/nodejs/souslesensEureka/public/Photo/"
    self.photosRootUrl = "/Photo/"

    self.showData = function (hit) {
        /* agence: "ATD Quart-Monde"
         attachment.content: " 53642 PH0070001006 0070 001 006 n divers ATD Quart-Monde --- --- P.Joseph: Adendas Calepin 1967  Gabrielle Erpicum  Thu Jun 01 1967 00:00:00 GMT+0000 (UTC) divers Agendas  Calepins Joseph Wresinski 1967++++ +++++++++++++ JUIN :  1   - Royan (France)  - stage anglais père Joseph   2   - Royan (France)  - stage anglais père Joseph   3   - Royan (France)  - stage anglais père Joseph   4   - Royan (France)  - stage anglais père Joseph   5   - Royan (France)  - stage anglais père Joseph   6   - Royan (France)  - stage anglais père Joseph   7   - Royan (France)  - stage anglais père Joseph   8   - Royan (France)  - stage anglais père Joseph   9  - réunion religieuse - Royan (France)  - stage anglais père Joseph   10   - Royan (France)  - stage anglais père Joseph   11   - Royan (France)  - stage anglais père Joseph   12   - Royan (France)  - stage anglais père Joseph   13   - Royan (France)  - stage anglais père Joseph   14   - Royan (France)  - stage anglais père Joseph   15   - Royan (France)  - stage anglais père Joseph   16   - Royan (France)  - stage anglais père Joseph   17 ? St Maur, conf.       18        19        20        21        22        23     - stage finit R.   24      - Mlle Renaud (secrétariat)  25        26        27    - réunion de parents, jardin d’enfants                                  - réunion Science et Service  - M. Catani  28    - bureau conseil d’adm. chez Geneviève  - Silvio Gomez de Bostos  29      - Gén. Faure  30    -Pierrelaye,MrsOst,Alençon  ++ Mon Apr 26 2010 00:00:00 GMT+0000 (UTC) PS"
         contenu: "P.Joseph: Adendas Calepin 1967 "
         date: "1967-06-01T00:00:00.000Z"
         dateMaj: "2010-04-26T00:00:00.000Z"
         description: "Agendas  Calepins Joseph Wresinski 1967++++ +++++++++++++ JUIN :  1   - Royan (France)  - stage anglais père Joseph   2   - Royan (France)  - stage anglais père Joseph   3   - Royan (France)  - stage anglais père Joseph   4   - Royan (France)  - stage anglais père Joseph   5   - Royan (France)  - stage anglais père Joseph   6   - Royan (France)  - stage anglais père Joseph   7   - Royan (France)  - stage anglais père Joseph   8   - Royan (France)  - stage anglais père Joseph   9  - réunion religieuse - Royan (France)  - stage anglais père Joseph   10   - Royan (France)  - stage anglais père Joseph   11   - Royan (France)  - stage anglais père Joseph   12   - Royan (France)  - stage anglais père Joseph   13   - Royan (France)  - stage anglais père Joseph   14   - Royan (France)  - stage anglais père Joseph   15   - Royan (France)  - stage anglais père Joseph   16   - Royan (France)  - stage anglais père Joseph   17 ? St Maur, conf.       18        19        20        21        22        23     - stage finit R.   24      - Mlle Renaud (secrétariat)  25        26        27    - réunion de parents, jardin d’enfants                                  - réunion Science et Service  - M. Catani  28    - bureau conseil d’adm. chez Geneviève  - Silvio Gomez de Bostos  29      - Gén. Faure  30    -Pierrelaye,MrsOst,Alençon  ++"
         document: "006"
         dossier: "0070".sousdossier
         droit_image: "---"
         id: 53642
         incrementRecordId: 1412822330
         indexCIJW: "PH0070001006"
         lien: "n"
         lieu: "divers"
         photographe: "divers"
         redacteur: "PS"
         sousdossier: "001"
         temoin_ref: "Gabrielle Erpicum "
         __proto__: Object*/
        var leftDivFields = ["date", "lieu", "photographe", "description"]
        var rightDivFields = ["indexCIJW", "contenu", "droit_auteur", "droit_image"]

        var data = hit._source
        var html = "<table>"
        leftDivFields.forEach(function (field) {
            html += "<tr>"
            html += "<td  class='tdBold'>" + field + "</td>"
            var value = ""
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

        if (data.indexCIJW && data.indexCIJW.indexOf("PH") == 0) {

            var photoPath =data.dossier + "*/" + data.sousdossier+"*/"+ data.document + "/" ;
            var photosRootUrl = self.photosRootUrl+photoPath
            var payload = {getPhotosFromDir: self.photosDir+photoPath}
            $.ajax({
                type: "POST",
                url: appConfig.elasticUrl,
                data: payload,
                dataType: "json",
                success: function (data, textStatus, jqXHR) {
                    var array = [];
                    data.forEach(function (item) {
                        array.push({"thumb" : photosRootUrl+item})
                    })
                    $('.fotorama').fotorama({
                        data: array
                    });
                }
                , error: function (err) {
                    console.log(err.responseText)
                    $('.fotorama').html("no photos found")
                }
            });

        }


    }


    return self;


})()
