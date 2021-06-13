var fs = require('fs')
var path = require('path')
var photosDirName = 'Photo'
PhotosMamanager = {

    getPhotosFromDir: function (dir, callback) {


        var sep = path.sep
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


        for (var i = photosDirIndex + 1; i < photodirs.length; i++) {
            // photodirs.forEach(function(dir,index){
            var realDirName = getRealDirName(photosPath, photodirs[i])
            if (!realDirName)
                break;
            photosPath += sep + realDirName
        }


        if (!fs.existsSync(photosPath)) {
            return callback(dir + " not exists");
        }
        var files = fs.readdirSync(photosPath)

        return callback(null, files);


    }


}

module.exports = PhotosMamanager
//var x = "D:\\webstorm\\souslesensEureka\\public\\Photo\\6021\\003\\002"
//PhotosMamanager.getPhotosFromDir(x)
