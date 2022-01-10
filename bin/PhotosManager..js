var fs = require('fs')
var path = require('path')
var photosDirName = 'Photo'
var glob = require("glob")
var Config=require('./globalParams.')
PhotosManager = {

    photosLimit: 10000,
    getPhotosList: function (filterStr, photosDir,options,callback) {

        var indexDirPath =Config.photos.miniaturesDirectory
        indexDirPath+=photosDir+"/"

        indexDirPath = path.resolve(indexDirPath)+path.sep

        var globOptions={
            root:indexDirPath,

        }

        var pattern
        if(photosDir=="phototheque")
            pattern="/**"+options.pattern[0];
        else {
            pattern = "/*";
            options.pattern.forEach(function (item) {
                pattern += "*"
                pattern += item

            })
        }


        pattern+="*.*"

        console.log(JSON.stringify(options.pattern))



        glob(pattern, globOptions, function (err, files) {
            if(err)
                return callback(err)
            console.log("************  "+pattern+" "+files.length)
            var photos=[]

            if(photosDir=="phototheque" && files.length>0){
                var dossierData=JSON.parse(""+fs.readFileSync(files[0]))
                var photosData=[];


                dossierData.forEach(function(photo){
                    var h,p,q;
                    var x=photo.lastIndexOf("|")
                    if((h=photo.indexOf(options.pattern[0]))>-1 && h<x)
                        if((p=photo.indexOf(options.pattern[1]))>-1 && p>h && p<x)
                            if(true || (q=photo.indexOf(options.pattern[2]))>-1 && q>p && q<x)
                                photos.push(photo)



                })

            }
            else {
                files.forEach(function (photo) {
                    photos.push(photo.substring(photo.lastIndexOf(path.sep) + 1))
                })
            }


            var result = {files: photos,dirPath:indexDirPath}
            callback(null, result);
        })



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

var options={
    rootww:"Y:\\baillet\\miniaturesPhotos\\artotheque",
    rootxx:"D:\\webstorm\\souslesensVocables\\bin",
    root:"D:\\temp\\artotheque"
}

if( false) {
    glob("/**1107**.*", options, function (er, files) {

        var x = files
    })
}


