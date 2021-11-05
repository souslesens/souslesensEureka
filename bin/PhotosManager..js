var fs = require('fs')
var path = require('path')
var photosDirName = 'Photo'
PhotosManager = {

    photosLimit: 10000,
    getPolythequePhotos: function (bordereauTitle, callback) {

        var bordereauNumber = bordereauTitle.substring(0, 3)
        var indexDirPath = path.join(__dirname, "../public/Photos/INDEXES/polytheque/")
        indexDirPath = path.resolve(indexDirPath)+path.sep


        var photos = []
        var files = fs.readdirSync(indexDirPath);
        for (var i = 0; i < files.length; i++) {
            if (files[i].indexOf(bordereauNumber) == 0) {
                photos.push( files[i])
                if (photos.length > PhotosManager.photosLimit)
                    break;
            }
        }
        var result = {files: photos}
        callback(null, result);

    },


    getPhotosFromDir: function (dir, callback) {


        var sep = path.sep
        if (sep == "\\")
            dir = dir.replace(/\//g, sep)

        var dirs = dir.split(sep)
        var photodirs = []


        var photosDirIndex;
        dirs.forEach(function (dir, index) {
            if (dir == photosDirName)
                photosDirIndex = index
            photodirs.push(dir)
        })

        var photosPath = ""
        photodirs.forEach(function (dir, index) {

            if (index > photosDirIndex)
                return;
            if (index > 0)
                photosPath += sep
            photosPath += dir
        })


        function getRealDirName(path, name) {
            var subDirs = fs.readdirSync(path)
            var realDirName = null
            subDirs.forEach(function (subDir) {
                if (!realDirName && subDir.indexOf(name) == 0)
                    realDirName = subDir
            })
            return realDirName

        }

        var nSep = 1
        /*if(sep=="\\")// moins de slashes dans windows
            nSep=0*/
        for (var i = photosDirIndex + 1; i < photodirs.length - nSep; i++) {
            var realDirName = getRealDirName(photosPath, photodirs[i])
            if (!realDirName) {
                return callback(photodirs[i] + " not exists");
                break;
            }
            var newPath = photosPath + sep + realDirName.replace(/ /g, "\ ")
            photosPath += sep + realDirName.replace(/ /g, "\ ")
        }


        if (!fs.existsSync(photosPath)) {
            return callback(photosPath + " not exists");
        }
        var files = fs.readdirSync(photosPath)
        var result = {files: files, realPath: photosPath + sep}

        return callback(null, result);


    }


}

module.exports = PhotosManager
var x = "D:\\webstorm\\souslesensEureka\\public\\Photo\\6021\\003\\002"
//PhotosManager.getPhotosFromDir(x)
