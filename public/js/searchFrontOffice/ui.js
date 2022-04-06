var ui = (function () {
    var self = {};


    self.getHitDiv = function (hit, displayConfig) {
        var indexLabel = context.indexConfigs[hit._index].general.label
        var html = "<div class='hit' onclick=Search.searchHitDetails('" + hit._id + "',$(this)) >" +
            "<span style=' font-size: 12px;color:brown; font-weight: bold'>" + indexLabel + " : </span>  " +
            "" + self.getHitListItemHtml(hit, displayConfig) +
            "" +
            "" +
            "</div>"
        return html;

    }
    self.showResultList = function (hits, displayConfigs) {
        var html = "";
        hits.forEach(function (hit, index) {
            var displayConfig = context.indexConfigs[hit._index].display
            html += self.getHitDiv(hit, displayConfig)
        })


        $("#resultDiv").html(html);


    }




    self.getDetailHtmlContent_generic = function (hit, displayConfig) {

       /* if (!displayConfig || displayConfig.length == 0 && template == "details") {
            delete hit._source["attachment.content"]
            return JSON.stringify(hit._source, null, 2).replace(/\n/g, "<br>")
        }*/
        var words = []
       /// var appConfig = {}
        var template = "details"
        if (false && context !== undefined) {
            var words = self.getQuestionWords(context.question);
        }
        var html = "";
  
        var htmlArray=[];
        var textAreaIndex=false
        displayConfig.forEach(function (line,indexLine) {


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

            if(appConfig.dictionary[fieldName]){
                fieldValue=appConfig.dictionary[fieldName][fieldValue] || fieldValue
            }

            if (fieldValue.replace) {
              //  fieldValue = fieldValue.replace(/\n{2}/gm, "<br>")
              //  fieldValue = fieldValue.replace(/\n/gm, "<br>")
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
                textAreaIndex=indexLine
                fieldValue = fieldValue.replace(/\n/gm, "<br>")
                fieldValue = fieldValue.replace(/<br>/gm, "\n")


                fieldValue = "<textarea id='attachmentContentTA'>" + fieldValue + "</textarea>"
            }

            if (template == "details") {

                fieldValue = "<span class='" + template + "'>" + fieldValue + "</span>";
                var html_ = "<span class='fieldTitle'>" + fieldLabel.replace("attachment.","") + " : </span>" + fieldValue + "<hr>";
                htmlArray.push(html_)
              
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




        if (template == "details") {
            var htmlLeft = "";
            var htmlRight = "";
         
            if(textAreaIndex){
                htmlArray.forEach(function(item,index){
                    if(index==textAreaIndex)
                        htmlLeft+=item
                    else
                        htmlRight+=item
                })
            }else {
                var half=htmlArray.length/2
                htmlArray.forEach(function(item,index){
                    if(index<=half)
                        htmlLeft+=item
                    else
                        htmlRight+=item
                })

            }
        }
        return {html: html, htmlLeft: htmlLeft, htmlRight: htmlRight};

    }

    self.resetDetailsDiv=function(){
        $("#detailsDiv").html("")
    }

    self.showHitDetails = function (hit) {
        var indexesWithPhotos=["photos","bordereaux","artotheque","arkotheque1"]




        if( indexesWithPhotos.indexOf(hit._index)>-1){

            $("#detailsDiv").load("snippets/detailsPhotos.html",function(){
                var displayConfig = context.indexConfigs[hit._index].display;

                if(hit._index=="bordereaux"){
                    var url="/instrumentsDeRecherchePDFs/0117-Etudes-1959_2014-DS.pdf"
                     var p=hit._source.title.lastIndexOf(".")
                    var title=hit._source.title.substring(0,p)+".pdf"
title=title.replace("-DS","")
                    var url="/montageBordereauxPdfs/"+title
                    $("#detailedDataPdfIframe").width( $("#detailedDataPdfIframe").parent().width());
                    $("#detailedDataPdfIframe").height('400px');
                    $("#detailedDataPdfIframe").css("display","block");
                    $("#detailedDataPdfIframe").attr('src',url);



                }else {
                    var htmlObj = self.getDetailHtmlContent_generic(hit,displayConfig)
                    $("#detailedDataDivLeft").html(htmlObj.htmlLeft)
                    $("#detailedDataDivRight").html(htmlObj.htmlRight)
                }

                Photos.showPhotos(hit);
            });

            return;

        }else {
            var displayConfig = context.indexConfigs[hit._index].display;
            var indexLabel = context.indexConfigs[hit._index].general.label;

            for (var thesaurus in context.allowedThesauri) {
                if (hit._source["entities_" + thesaurus])
                    hit = Entities.setHitEntitiesHiglight(hit, hit._source["entities_" + thesaurus])
            }
            var hitHtml = self.getHitDetailHtml(hit, displayConfig,)

            var entitieLegendHtml = Entities.getEntitiesLegendDiv();
            var html = ""
            html += "<div style='display:flex;flex-direction:row;background-color:#e0dddd ' >" + entitieLegendHtml + "<div id='entityExtractDiv'></div></div>"
            html += "<div id='detailsContentDiv'> <b> Source : </b><span class='title'>" + indexLabel + "</span><hr> "
            html += hitHtml + "</div>"
            html += "</div>";


            $("#detailsDiv").html(html);
          /*  $("#dialogDiv").html(html);
            $(".hlt1").css("background-color", " #FFFF00");
            $(".dialogDiv").css("top", " 100px");
            $("#dialogDiv").dialog("open")*/

        }


    }



    self.setHighlight = function (text, highlightedWords) {
        if (highlightedWords.length > 2)
            return text;
        if (!text.replace)
            return text;
        highlightedWords.forEach(function (word) {
            word = word.replace(/\*/g, "")
            var regex = new RegExp(word, "igm");
            var regex = new RegExp("[., ]" + word + "[., ]", "igm");
            text = text.replace(regex, function (matched, index, original) {
                return "<em class='hlt1'>" + matched + "</em>"
            })
        })
        return text;
    }

    self.getQuestionWords = function (question) {
        var words = [];

        var regexPhrase = /(\w{3,})/ig;// only words and numbers
        var array;
        while ((array = regexPhrase.exec(question)) != null) {
            //  array.forEach(function (line) {
            words.push(array[1]);
        }

        return words;
    }





    self.getHitDetailHtml = function (hit, displayConfig, template) {

     /*   if (!displayConfig || displayConfig.length == 0 ) {
            delete hit._source["attachment.content"]
            return JSON.stringify(hit._source, null, 2).replace(/\n/g, "<br>")
        }*/


        var html = "";
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


if(appConfig.dictionary[fieldName]){
    fieldValue=appConfig.dictionary[fieldName][fieldValue] || fieldValue
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

               // fieldValue = self.setHighlight(fieldValue, words);


            if (line[fieldName].hyperlink) {
                fieldValue = "<a href='" + fieldValue + "'>" + "cliquez ici" + "</a>"
            }


            var cssClass = line[fieldName].cssClass;

            if (!cssClass)
                cssClass = "";


                fieldValue = "<span class='" + template + "'>" + fieldValue + "</span>";
                html += "<B>" + fieldLabel + " : </B>" + fieldValue + "<hr>";



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
        return html;
    }

    self.getHitListItemHtml = function (hit, displayConfig, template) {

        if (!displayConfig || displayConfig.length == 0) {
            delete hit._source["attachment.content"]
            return JSON.stringify(hit._source, null, 2).replace(/\n/g, "<br>")
        }


        var html = "";
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
             //   fieldValue = fieldValue.replace(/(\d{4})-(\d{2})-(\d{2}).*Z/, function (a, year, month, day) {
                    fieldValue = fieldValue.replace(/(\d{4})-(\d{2})-(\d{2}).*/, function (a, year, month, day) {
                    if (appConfig.locale == "Fr")
                        return "" + day + "/" + month + "/" + year
                    return "" + year + "/" + month + "/" + day
                })
            }


            if (line[fieldName].hyperlink) {
                fieldValue = "<a href='" + fieldValue + "'>" + "cliquez ici" + "</a>"
            }


            var cssClass = line[fieldName].cssClass;

            if (!cssClass)
                cssClass = "";



                fieldValue = "<span class='list " + cssClass + "'><b>" + fieldValue + "</b></span>";
                html += fieldValue + "&nbsp;&nbsp;";



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
        return html;
    }





    return self;
})()

