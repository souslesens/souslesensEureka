

var Panier=(function(){
    var self={}
    self.panier=[]


    self.ajouterPhotoAuPanier=function(photoPath){
        if( !photoPath)
            photoPath=Photos.currentPhotoPath;
        self.panier.push(photoPath)
    }


    self.voirPanier=function(){
        var html=""
         self.panier.forEach(function(path,index){
            html+="<div><input type='checkbox' id='"+index+"'>" +
                "<img width='100px' src='"+path+"'></div>"
        })
        $("#dialogDiv").load("snippets/panier.html",function(){
            $("#Panier_photosDiv").html(html)
        });
        $(".dialogDiv").css("top", " 100px");
        $("#dialogDiv").dialog("open")


    }

    self.telecharger=function(){

    }

    self.vider=function(){
        self.panier=[]
        $("#dialogDiv").html("");
    }




    return self;


})()