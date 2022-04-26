var Panier = (function () {
    var self = {}
    self.panier = {}


    self.ajouterPhotoAuPanier = function (photoPath) {
        if (!photoPath)
            photoPath = Photos.currentPhotoPath;
        var key = common.getRandomHexaId(10)
        self.panier[key] = photoPath
    }


    self.voirPanier = function () {
        if (Object.keys(self.panier).length == 0)
            return alert("Le panier est vide")
        var html = ""
        var index = 0
        for (var key in self.panier) {

            html += "<div class='photoDiv' id='" + key + "'>" +
                "<div><img width='150px' src='" + self.panier[key] + "'></div>" +
                "<div><button onclick=Panier.removeFromPanier('" + key + "')>X</button></div>" +
                "</div> "

        }
        $("#dialogDiv").load("snippets/panier.html", function () {
            $("#Panier_photosDiv").html(html)
        });
        $(".dialogDiv").css("top", " 100px");
        $("#dialogDiv").dialog("open")


    }

    self.removeFromPanier = function (key) {
        $("#" + key).remove()
        delete self.panier["photo_" + key]
    }

    self.telecharger = function () {
        if (Object.keys(self.panier).length == 0)
            return alert("Le panier est vide")
        //alert("en cours de développement")
        var photos = []
        for (var key in self.panier) {
            photos.push(self.panier[key])
        }
        var payload = {
            downloadPanier: 1,
            user: context.currentUser.identifiant,
            content: JSON.stringify(photos)

        }
// Build a form
        var form = $('<form></form>').attr('action', appConfig.elasticUrl).attr('method', 'post');
// Add the one key/value
        for (var key in payload) {
            form.append($("<input></input>").attr('type', 'hidden').attr('name', key).attr('value', payload[key]));
        }
//send request
        form.appendTo('body').submit().remove();
        alert("l'archive sera disponible dans votre dossier 'Téléchargements' dans quelques instants")


    }

    self.vider = function () {
        if (confirm("vider le panier")) {
            self.panier = {}
            $("#dialogDiv").html("");
        }
    }

    self.fermerDialog = function () {
        $("#dialogDiv").dialog("close")
    }


    return self;


})()