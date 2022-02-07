var fs=require('fs');

var FilerProxy={


    getFile:function(path,callback){
        var data=fs.readFileSync(path)//.toString('base64')
       // data= btoa(data)
        return callback(null, data)


    }




}

module.exports=FilerProxy