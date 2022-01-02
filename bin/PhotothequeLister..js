
var fs = require('fs');
var path = require('path');
var async = require('async');

var ThumbnailManagerPolytheque=require('./thumbnailManagerPolytheque.')
var PhotothequeLister = {

    getDirContent: function (dirPath, options, callback) {
        if (!options) {
            options = {}
        }

        //  var dirsArray = []
        var dirFilesMap = {}
        var rootDirName = path.basename(dirPath)
        var totalDirs = 0

        function recurse(parent,level) {



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
                    recurse(fileName,level+1)
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
                    if ((totalDirs++) % 1000== 0)
                       ;// console.log("directories " + totalDirs)


                    dirFilesMap[parent].push({type: "file", parent: parent, name: files[i], infos: infos})
                    if(false && options.limit && totalDirs>options.limit )
                        return callback(null,dirFilesMap)
                    // dirsArray.push({type: "file", parent: parent, name: files[i], infos: infos})
                }
            }
        }

        recurse(dirPath,0);
        return callback(null, dirFilesMap)
    },
//
}

if(true) {
    sourceDir = "/mnt/montageJungle/phototheque/INDEX/"
    targetDir = "/var/miniaturesPhotos/phototheque/"
    console.log("sourceDir : " + sourceDir)
    console.log("targetDir : " + targetDir)
   /// getPhotosIndexList(sourceDir, targetDir)


    var files = fs.readdirSync(sourceDir);
    var dirs=[]
    for (var i = 0; i < files.length; i++) {
        var fileName=sourceDir+files[i]

        var stats = fs.statSync(fileName);

        if (stats.isDirectory(fileName)) {
            dirs.push(fileName);
        }


    }
var count=0
    async.eachSeries(dirs,function(topDir,callbackEach){
if(count++%10==0)
    console.log(count)


    PhotothequeLister.getDirContent(topDir, {}, function (err,result) {

        var array=[]
      for( var key in result ) {
          var dir=key.replace(sourceDir,"")
          result[key].forEach(function(file){
              array.push((dir+file.name).replace(/\//g,"|"))
          })

        }

        var topDir2=topDir.replace(sourceDir,"")
        fs.writeFileSync(targetDir + topDir2+"_indexJungle.json",JSON.stringify(array))
        callbackEach(null)
    })
    })
}







//ThumbnailManager.create("C:\\Users\\claud\\Pictures\\")