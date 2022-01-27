var fs = require('fs');
var path = require('path');
var async = require('async');



var PhotosDiffCheck={


    getDirContent: function (dirPath, options, callback) {
        if (!options) {
            options = {}
        }

        //  var dirsArray = []
        var dirFilesMap = {}
        var rootDirName = path.basename(dirPath)
        var totalDirs = 0

        function recurse(parent) {
            parent = path.normalize(parent);
            if (!fs.existsSync(parent))
                return callback("dir doesnt not exist :" + parent)
            if (parent.charAt(parent.length - 1) != path.sep)
                parent += path.sep;


            var files = fs.readdirSync(parent);
            for (var i = 0; i < files.length; i++) {
                var fileName = parent + files[i];
                var stats = fs.statSync(fileName);
                var infos = {lastModified: stats.mtimeMs};//fileInfos.getDirInfos(dir);

                if (stats.isDirectory(fileName)) {
                    dirFilesMap[fileName + path.sep] = [];
                    //  dirsArray.push({type: "dir", name: files[i], parent: parent})
                    recurse(fileName)
                } else {

                    var p = fileName.lastIndexOf(".");
                    if (p < 0)
                        continue;
                    var extension = fileName.substring(p + 1).toLowerCase();
                    if (options.acceptedExtensions && options.acceptedExtensions.indexOf(extension) < 0) {
                        continue;
                    }
                    if (options.maxDocSize && stats.size > options.maxDocSize) {
                        console.log("!!!!!! " + fileName + " file  too big " + Math.round(stats.size / 1000) + " Ko , not indexed ");
                        continue;
                    }
                    if (!dirFilesMap[parent])
                        dirFilesMap[parent] = []
                    dirFilesMap[parent].hasJPG = true
                    if ((totalDirs++) % 10 == 0)
                        console.log("directories " + totalDirs)


                    dirFilesMap[parent].push({type: "file", parent: parent, name: files[i], infos: infos})
                    if(options.limit && totalDirs>options.limit )
                        return callback(null,dirFilesMap)
                    // dirsArray.push({type: "file", parent: parent, name: files[i], infos: infos})
                }
            }
        }

        recurse(dirPath);
        return callback(null, dirFilesMap)
    },










}
module.exports=PhotosDiffCheck

var miniaturesDir="Y:\\baillet\\miniaturesPhotos\\"
PhotosDiffCheck.getDirContent(miniaturesDir+"polytheque",null,function(err, result){
    if(err)
        return console.log(err)
    var x=result;
})