var fs = require('fs');
var sax = require('sax');
var async = require('async');

var BordereauxProcessor = {


    readJson: function (filePath, callback) {

        var headers = [];
        var dataArray = [];
        try {
            var str = "" + fs.readFileSync(filePath);
            dataArray = JSON.parse(str);
        } catch (e) {
            return callback(e);
        }
        dataArray.forEach(function (line) {

            Object.keys(line).forEach(function (key) {
                if (headers.indexOf(key) < 0)
                    headers.push(key)

            })

        })
        return callback(null, {headers: headers, data: dataArray})
    },


    testJson: function (filePath, callback) {
        BordereauxProcessor.readJson(filePath, function (err, result) {
            var x = result
        })
    },


    parseXml: function (filePath, callback) {
        var saxStream = sax.createStream(false);

        var tables = []

        var currentTable = null
        var currentRow = null
        var currentCell = null
        var line = 0;
        saxStream.on("error", function (e) {
            console.error("error!", e);
            // clear the error
            this._parser.error = null;
            this._parser.resume();
        });


        var json = {classes: [], generalizations: [], collaborations: [], associations: []};
        saxStream.on("opentag", function (node) {

            line++;
            if (line % 10000 == 0) console.log(line);
            //  console.log(node.name)
            //  var name = node.attributes["NAME"];


            if (node.name == "W:TBL") {
                currentTable = [];
            }


            if (node.name == "W:TR") {
                if (currentTable)
                    currentRow = [];
            }
            if (node.name == "W:TC") {
                if (currentRow)
                    currentCell = "";
            }

            if (node.name == "W:T") {

                ;//   currenText="";
            }


        });

        saxStream.on("text", function (text) {


            if (currentCell !== null) {
                if (text && text != "\n")
                    currentCell += text;

            }
        });

        saxStream.on("closetag", function (node) {
            // var name = node.attributes["NAME"]

            if (node == "W:TBL") {
                tables.push(currentTable)
            }

            if (node == "W:TR") {
                currentTable.push(currentRow)
                currentRow = null
            }
            if (node == "W:TC") {
                var str = currentCell.replace(/[\n\t\r]/g, "")
                currentRow.push(str)
            }


        });


        saxStream.on("end", function (node) {
            var x = tables
            callback(null, tables);
        });


        fs.createReadStream(filePath).pipe(saxStream);
    },


    rowsToCSVtable: function (rows) {
        var str = ""
        rows.forEach(function (row) {
            row.forEach(function (cell, indexCell) {
                if (indexCell > 0)
                    str += "\t"
                str += cell;//.replace(/[\n\t\r]/g, "")
                //   str += "\""+cell+"\""

            })
            str += "\n"
        })
        return str;

    },

//complete les cellules vides des 3 premieres colonnnes
    fillArrayEmptyCells: function (array) {
        array.forEach(function (row, rowIndex) {
            row.forEach(function (cell, indexCell) {
                if (rowIndex > 1 && indexCell < 3) {
                    if (cell == "")
                        array[rowIndex][indexCell] = array[rowIndex - 1][indexCell]
                }
            })
        })
        return array
    },


    testTextTree: function (filename) {

        const fs = require('fs');
        const readline = require('readline');
        var maxLines = 10000
        count = 0
        var start = false

        async function processLineByLine() {
            const fileStream = fs.createReadStream(filename);

            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });
            // Note: we use the crlfDelay option to recognize all instances of CR LF
            // ('\r\n') in input.txt as a single line break.

            for await (const line of rl) {
                if (line.indexOf("1101-AFRique") > -1)
                    start = true

                // Each line in input.txt will be successively available here as `line`.
                //   var array=line.split("│");
                if (start) {
                    if (count++ > maxLines)
                        var x = 3
                    if (line.indexOf(".") < 0 && line.indexOf("JPG") < 0)
                        console.log(line)
                }
//console.log(JSON.stringify(array))
                //  console.log(`Line from file: ${line}`);
            }
        }

        processLineByLine();

    },
    buildParts: function (treeDirPath, openXmlFilePath) {
        var tableArray = null;
        var treeDirJson = null
        var treeDirRoot = {}
        var treeMap = {}

        var colNames = ['n1', 'n2', 'n3', 'contenu', 'auteur', 'remarques', 'x', 'debut', 'fin', 'C', 'P', 'R']


        async.series([
                //load dirTree
                function (callbackSeries) {
                    BordereauxProcessor.readJson(treeDirPath, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        treeDirJson = result
                        callbackSeries();
                    })

                }

                //parse doc array
                , function (callbackSeries) {
                    BordereauxProcessor.parseXml(openXmlFilePath, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        tableArray = result[1]
                        callbackSeries();
                    })
                }
                //complete doc array
                , function (callbackSeries) {
                    tableArray = BordereauxProcessor.fillArrayEmptyCells(tableArray)
                    callbackSeries();
                }

                , function (callbackSeries) {
                    return callbackSeries();
                    treeDirRoot = {name: "#", children: {}}
                    var tree = treeDirJson.data[0].contents
                    tree.forEach(function (docItem) {
                        treeDirRoot.children[docItem] = {name: docItem.name, children: {}}
                        docItem.contents.forEach(function (level_1) {
                            level_1.contents.forEach(function (item1) {
                                treeDirRoot.children[docItem].children[item1.name] = {name: item1.name, children: {}}
                                item1.contents.forEach(function (item2) {
                                    treeDirRoot.children[docItem].children[item1.name].children[item2.name] = {
                                        name: item2.name,
                                        children: {}
                                    }
                                    item2.contents.forEach(function (item3) {
                                        treeDirRoot.children[docItem].children[item1.name].children[item2.name].children[item3.name] = {
                                            name: item3.name,
                                            contents: item3.contents
                                        }
                                    })
                                })
                            })

                        })
                    })
                    callbackSeries();
                },

                function (callbackSeries) {

                    var tree = treeDirJson.data[0].contents
                    var myTree = {}
                    tree.forEach(function (item) {
                        if (item.name.indexOf("1101") == 0)
                            myTree = item
                    })

                    myTree.contents.forEach(function (item1) {
                        var str1 = item1.name.split("-")[0]
                        var num1 = parseInt(str1)
                        treeMap["_" + num1] = {name: item1.name}
                        item1.contents.forEach(function (item2) {
                            var str2 = item2.name.split("-")[0]
                            var num2 = parseInt(str2)
                            treeMap["_" + num1 + "_" + num2] = {name: item2.name}
                            item2.contents.forEach(function (item3) {
                                var str3 = item3.name.split("-")[0]
                                var num3 = parseInt(str3)
                                if (isNaN(str3))
                                    console.log(str3)
                                treeMap["_" + num1 + "_" + num2 + "_" + num3] = {name: item3.name, data: item3.contents}


                            })
                        })
                    })


                    tableArray.forEach(function (row, rowIndex) {
                        if (rowIndex < 1)
                            return;

                        var num1, num2, num3
                        var str1 = row[0].split("-")[0]
                        var str2 = row[1].split("-")[0]
                        var str3 = row[2].split("-")[0]
                        if (str1 != "")
                            num1 = parseInt(str1)
                        if (treeMap["_" + num1])
                            treeMap["_" + num1].infos = row;

                        if (str2 != "")
                            num2 = parseInt(str2)
                        if (treeMap["_" + num1 + "_" + num2])
                            treeMap["_" + num1 + "_" + num2].infos = row;
                        if (str3 != "")
                            num3 = parseInt(str3)
                        if (treeMap["_" + num1 + "_" + num2 + "_" + num3])
                            treeMap["_" + num1 + "_" + num2 + "_" + num3].infos = row;


                    })

                    callbackSeries();
                }

                //make csv
                , function (callbackSeries) {
                    var str = "Cle_repertoire\tnom repertoire\tn1\t n2\t n3\t contenu\t auteur\t remarques\t x\t debut\t fin\t C\t P\t R\n"

                    for (var key in treeMap) {
                        var item = treeMap[key]
                        str+=key+"\t"+item.name+"\t"
                        if(item.infos){
                            item.infos.forEach(function (cell){
                                if( cell.indexOf("-")==0)// pour excel
                                    cell=" "+ cell
                                str+=cell+"\t";
                            })
                        }

                        if(item.data){
                            item.data.forEach(function (obj){
                                str+=obj.name+"\t";
                            })
                        }
                        str+="\n"




                    }
                    var str2 =str;// Buffer.from(str, 'Windows-1252')
                    fs.writeFileSync(treeDirPath+".csv",str2)

                    callbackSeries();
                }


            ],

            function (err) {
                if (err)
                    return console.log(err)
                //  fs.writeFileSync(filePath + ".csv", csv)
                return console.log("DONE")
            }
        )


    }


}

module.exports = BordereauxProcessor;

var treeDirPath = "D:\\ATD_Baillet\\Search2021\\treeDirs.json"

var openXmlFilePath = "D:\\ATD_Baillet\\Search2021\\1101-AFRique-DelReg-2003_2017N\\document.xml"

BordereauxProcessor.buildParts(treeDirPath, openXmlFilePath, function (err, result) {

})
