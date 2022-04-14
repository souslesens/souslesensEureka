var Panier = (function () {
    var self = {}
    self.panier = []


    self.ajouterPhotoAuPanier = function (photoPath) {
        if (!photoPath)
            photoPath = Photos.currentPhotoPath;
        self.panier.push(photoPath)
    }


    self.voirPanier = function () {
        if (self.panier.length == 0)
            return alert("Le panier est vide")
        var html = ""
        self.panier.forEach(function (path, index) {
            html += "<div class='photoDiv'>" +
                "<div><img width='100px' src='" + path + "'></div>" +
                "<div><button onclick('Panier.removeFromPanier(" + index + ")>X</button></div>" +
                "</div> "
        })
        $("#dialogDiv").load("snippets/panier.html", function () {
            $("#Panier_photosDiv").html(html)
        });
        $(".dialogDiv").css("top", " 100px");
        $("#dialogDiv").dialog("open")


    }

    self.removeFromPanier = function (index) {
        self.panier
    }

    self.telecharger = function () {
        if (self.panier.length == 0)
            return alert("Le panier est vide")
        //alert("en cours de développement")
        var payload = {
            downloadPanier: 1,
            user: context.currentUser.identifiant,
            content: JSON.stringify(self.panier)

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
            self.panier = []
            $("#dialogDiv").html("");
        }
    }

    self.fermerDialog = function () {
        $("#dialogDiv").dialog("close")
    }


    return self;


})()