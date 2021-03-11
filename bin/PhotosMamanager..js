var fs=require('fs')
PhotosMamanager={

    getPhotosFromDir:function(dir,callback){

        if (!fs.existsSync(dir)) {
            return callback(dir+" not exists");
        }
        var files=fs.readdirSync(dir)

        return callback(null,files);



    }



}

module.exports=PhotosMamanager

//PhotosMamanager.getPhotosFromDir("D:\\GitHub\\souslesensEureka\\public\\data\\photos\\IndexPhotos\\0073\\001\\004")
