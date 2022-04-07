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
            html += "<div><input type='checkbox' id='" + index + "'>" +
                "<img width='100px' src='" + path + "'></div>"
        })
        $("#dialogDiv").load("snippets/panier.html", function () {
            $("#Panier_photosDiv").html(html)
        });
        $(".dialogDiv").css("top", " 100px");
        $("#dialogDiv").dialog("open")


    }

    self.telecharger = function () {
        if (self.panier.length == 0)
            return alert("Le panier est vide")
        //alert("en cours de développement")
        var payload = {
            downloadPanier: 1,
            content: JSON.stringify(self.panier)

        }
        $.ajax({
            type: "POST",
            url: appConfig.elasticUrl,
            data: payload,
            dataType: "json",
            success: function (result, textStatus, jqXHR) {
            },
            error: function (err) {
                alert(err)
            }
        })


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