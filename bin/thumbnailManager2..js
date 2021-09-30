var thumb = require('node-thumbnail').thumb;
var fs=require('fs')
var path=require('path')
var async=require('async')
var ThumbnailManager= {


// thumb(options, callback);

  create: function (sourcePath, destinationPath,callback) {
    thumb({
      source: sourcePath, // could be a filename: dest/path/image.jpg
      destination: destinationPath,
      concurrency: 4,
      width: 500,
    }, function (files, err, stdout, stderr) {
    callback(err,"done")
    });
  }


  ,

  getDirContent: function (dirPath, options, callback) {
    if (!options) {
      options = {}
    }

    var dirsArray = []
    var dirFilesMap = {}
    var rootDirName = path.basename(dirPath)

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

        if (stats.isDirectory()) {
          dirFilesMap[fileName + "\\"] = [];
          dirsArray.push({type: "dir", name: files[i], parent: parent})
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
          dirFilesMap[parent].push({type: "file", parent: parent, name: files[i], infos: infos})
          // dirsArray.push({type: "file", parent: parent, name: files[i], infos: infos})

        }


      }

    }
    recurse(dirPath);
    return callback (null, dirFilesMap)

  }

}
var sourceDir="E:\\Photos\\photos2018";
var targetDir="D:\\photosThumbnails"
ThumbnailManager.getDirContent(sourceDir,{acceptedExtensions:["jpg"]},function(err, filesMap){
  var count=0
  async.eachSeries(Object.keys(filesMap),function(file,callbackFile) {


    var photos=filesMap[file]
    async.eachSeries(photos,function(photo,callbackPhoto) {

      var path = file + photo.name;
      ThumbnailManager.create(path, targetDir, function (err, result) {
        if (err)
          return callbackPhoto()
        if ((count++) % 10 == 0)
          console.log(count)
        callbackPhoto()
      })
    },function(err){
      return callbackFile(err);
    })
}, function(err){
    if(err)
      return console.log(err)
    return "DONE"
  })



})


//ThumbnailManager.create("C:\\Users\\claud\\Pictures\\")