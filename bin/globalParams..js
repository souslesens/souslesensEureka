/**
 * Created by claud on 09/05/2017.
 */
var globalParams={

    mysqlConnection:{
        host: "localhost",
       // user: "root",
        user:"bailletarchives",
        password: "vi0lon",
        database: 'bailletarchives',
        // database: 'bailletarchives_test'

    },

    photos:{

        miniaturesDirectory:"/var/miniaturesPhotos/",
        miniaturesDirectoryWindows:"Y:\\baillet\\miniaturesPhotos\\",



        //ln -s /var/miniaturesPhotos /var/lib/nodejs/souslesensEureka/public/miniaturesPhotos
       // ln -s /var/montageJungle/ /var/lib/nodejs/souslesensEureka/public/montageJungle

    }




}

/*var globalParams={

    mysqlConnection:{
        host: "localhost",
        port:7202,
        user: "bailletarchives",
        password: "nodeApp55",
        database: 'bailletarchives_test'

    }




}*/
module.exports=globalParams;
