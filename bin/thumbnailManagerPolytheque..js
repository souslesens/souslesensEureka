//var thumb = require('node-thumbnail').thumb;
var fs = require('fs');
var path = require('path');
var async = require('async');
var watermark = require('jimp-watermark');
var Jimp = require('jimp')


var ThumbnailManagerPolytheque = {


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


    generateThumnail: function (imgPath, thumbnailPath, params, callback) {
        if (!fs.existsSync(imgPath))
            return callback("not exists")
        const JPEG = require('jpeg-js')
        Jimp.decoders['image/jpeg'] = (data) => JPEG.decode(data, {
            maxMemoryUsageInMB: 6144,
            maxResolutionInMP: 600
        })
        Jimp.read(imgPath, function (err, image) {
            if (err)
                return callback(err)
            image.resize(params.width, Jimp.AUTO);
            image.quality(params.quality);

            if (params.watermark.image) {
                var w = image.bitmap.width;
                var h = image.bitmap.height;
                var ww = params.watermark.image.bitmap.width;
                var wh = params.watermark.image.bitmap.height;
                var x = (w - ww) / 2
                var y = (h - wh) / 2

                image.composite(params.watermark.image, x, y, [
                    {
                        mode: Jimp.BLEND_SCREEN,
                        //   opacitySource: 1,
                        //   opacityDest: 0.25
                    }
                ]);
                image.write(thumbnailPath);
            } else
                image.write(thumbnailPath);


            return callback();


            image.getBuffer(Jimp.MIME_JPEG, function (err, buffer) {

                fs.open(thumbnailPath, 'w', function (err, fd) {
                    if (err) {
                        throw 'could not open file: ' + err;
                    }
                    fs.write(fd, buffer, 0, buffer.length, null, function (err) {
                        if (err) throw 'error writing file: ' + err;
                        fs.close(fd, function () {
                            console.log('wrote the file successfully');
                        });
                    });
                });
            });

            return callback()
        })
    },


    buidThumbnails: function (sourceDir, targetDir, includeParentDirInPhotoName, params, callback) {
        var watermarkImage
        var filesMap
        var thumbnailsCount = 0
        var t0 = new Date()
        async.series([
            function (callbackSeries) {

                // load watermark image
                Jimp.read(params.watermark.path, function (err, image) {
                    if (err)
                        return callbackSeries(err)
                    image.resize(params.width * params.watermark.ratio, Jimp.AUTO);
                    image.opacity(params.watermark.opacity)
                    watermarkImage = image;
                    callbackSeries()
                })

            },
            // get all photos
            function (callbackSeries) {
                ThumbnailManagerPolytheque.getDirContent(sourceDir, {acceptedExtensions: params.acceptedExtensions}, function (err, result) {
                    if (err)
                        return callbackSeries(err)
                    filesMap = result
                    callbackSeries()
                })
            },
            function (callbackSeries) {
                //generate all thumbnails
                const cachedJpegDecoder = Jimp.decoders['image/jpeg']
                Jimp.decoders['image/jpeg'] = (data) => {
                    const userOpts = {maxMemoryUsageInMB: 4096}
                    return cachedJpegDecoder(data, userOpts)
                }
                async.eachSeries(Object.keys(filesMap), function (dir, callbackDir) {

                    console.log("processing dir :" + dir)
                    var photos = filesMap[dir]

                    async.eachSeries(photos, function (photo, callbackPhoto) {
                        if (!filesMap[dir].hasJPG)
                            return callbackDir();
                        var imgPath = photo.parent + photo.name

                        var subdir = dir.replace(sourceDir, "")

                        var photoName = subdir.replace(/[\\:/]/g, "_") + photo.name

                        if (includeParentDirInPhotoName) {
                            var array = sourceDir.split(path.sep)
                            var lastDir = array[array.length - 1]
                            photoName = lastDir + "_" + subdir.replace(/[\\:/]/g, "_") + photo.name

                        }

                        var thumbnailPath = targetDir + photoName
                        params.watermark.image = watermarkImage

                        ThumbnailManagerPolytheque.generateThumnail(imgPath, thumbnailPath, params, function (err, result) {
                            if (err)
                                console.log(err);
                            thumbnailsCount += 1
                            if (thumbnailsCount % 5 == 0)
                                console.log("processed " + thumbnailsCount + " in " + ((new Date() - t0) / 1000) + " sec.")
                            callbackPhoto()

                        })

                    }, function (err) {

                        callbackDir(err)

                    })
                }, function (err) {
                    return callbackSeries(err)
                })


            }


        ], function (err) {
            return callback(err, "DONE total thumbnails :" + thumbnailsCount)
        })


    }
}


/*var sourceDir = "\\\\Jungle\\jungle\\Poly\\"
var targetDir = "\\\\Jungle\\jungle\\Poly\\INDEX\\"
var watermarkPath = path.join(__dirname, "../config/filigranes/logoseul-transparent.png")
watermarkPath = path.resolve(watermarkPath)
*/


/*v ar sourceDir = "C:\\Users\\claud\\Pictures\\test\\";
var targetDir = "D:\\photosThumbnails\\"

var sourceDir = "/var/lib/nodejs/souslesensEureka/public/Photos/polytheque/"
var targetDir = "/var/lib/nodejs/souslesensEureka/public/Photos/INDEXES/polytheque/"*/


sourceDir = "/var/montageJungle/phototheque/FONDS/7000_MOBILISATION_2017"
targetDir = "/var/miniaturesPhotos/phototheque/"


sourceDir = "/var/montageJungle/artotheque"
targetDir = "/var/miniaturesPhotos/artotheque/"




//var watermarkPath = "/var/lib/nodejs/souslesensEureka/config/filigranes/logoseul-transparent.png"
var watermarkPath = path.join(__dirname, "../config/filigranes/logoseul-transparent.png")
watermarkPath = path.resolve(watermarkPath)


var params = {
    width: 480,
    quality: 80,
    acceptedExtensions: ["jpg"],
    watermark: {
        path: watermarkPath,
        'ratio': 0.5,// Should be less than one
        'opacity': 0.15, //Should be less than one
    }
}

sourceDir = "/var/montageJungle/polytheque/1006-OCI-MDG-MADAGASCAR_MMM-2009_2015"
targetDir = "/var/miniaturesPhotos/polytheque/"

var includeParentDirInPhotoName = true
console.log("sourceDir : " + sourceDir)
console.log("targetDir : " + targetDir)
console.log("watermarkPath : " + watermarkPath)


var sourceDirs = ["/var/montageJungle/polytheque/1007-ADN-CAN-Canada-2011_2015",
    "/var/montageJungle/polytheque/1011-ArchivesAModave-AutourBeatification-2003_2014",
    "/var/montageJungle/polytheque/1012-ArchivesAModave-2001_2015",
    "/var/montageJungle/polytheque/1014_04N-ProcheOrient"]


var sourceDirs = [//'/var/montageJungle/polytheque/1017-FRA-Biblioth??quesRue-Paris11-2009_2015',
    '/var/montageJungle/polytheque/1053-CAL-BOL-Bolivia-2013_2015',
    '/var/montageJungle/polytheque/1054-CAL-GTM-Guatemala-1997_2015',
    '/var/montageJungle/polytheque/1060-documents-evaDiscernement-2014_2015',
    '/var/montageJungle/polytheque/1061-GpeDiscernement-2015_2016',
    '/var/montageJungle/polytheque/1065-OCI-MUS-IleMaurice-2015_2016',
    '/var/montageJungle/polytheque/1067-MessagesEcritParGabrielleErpicum-1988_2013',
    '/var/montageJungle/polytheque/1069-OCI-MUS-IleMaurice-Tapori-17Oct-2003_2011',
    '/var/montageJungle/polytheque/1072-CeQueVousMavezAppris-YvesPetit-Lyon',
    '/var/montageJungle/polytheque/1074-EUR-POL-Warsaw-2013_2016',
    '/var/montageJungle/polytheque/1076-EUR-LUXembourg-UniversitePopulaire-2009_2014',
    '/var/montageJungle/polytheque/1079-AFR-CAF-Centrafrique-BANGUI-2015_2016',
    '/var/montageJungle/polytheque/1083_03-MED-LBN-Liban-Beitouna',
    '/var/montageJungle/polytheque/1088-Tapori-International-2014_2017',
    '/var/montageJungle/polytheque/1089-pelerinageSiloe-PierreLaPlusPrecieuse',
    '/var/montageJungle/polytheque/1097-FRA_PoleFormationEngagements_DN--2012_2017_VersementNumerique',
    '/var/montageJungle/polytheque/1098-EUR-Mobilisation2017-RassemblementJeunesseWhije',
    '/var/montageJungle/polytheque/1101-AFRique-DelReg-2003_2017',
]

var sourceDirs = [/*'/var/montageJungle/polytheque/1103-INT-Benkadi-2015_2017',
    '/var/montageJungle/polytheque/1104-INT-PoleExpressionsPubliquesPEPS-2009_2015',
    '/var/montageJungle/polytheque/1107-PAEFI-MailsPaulMarechal-2008_2017',*/
    //!!!!!!!!!!!!!   '/var/montageJungle/polytheque/1110-TaporiInternational', stop a /var/montageJungle/polytheque/1110-TaporiInternational/087N/1110_87_04/
    '/var/montageJungle/polytheque/1111-FRAnce-DelegNationale-2003-2013',
    '/var/montageJungle/polytheque/1112-FRA-FRC-LaBise',
    '/var/montageJungle/polytheque/1115-CINT-ArrierePays-2016_2018',
    '/var/montageJungle/polytheque/1116-AnneeSabbatique-DenisGendre-2006_2007',
    '/var/montageJungle/polytheque/1117-EUR-BEL-UniversitePopulaireBruxelles-2010_2017',
    '/var/montageJungle/polytheque/1118',
    '/var/montageJungle/polytheque/1119-Videos-PhilippeHamel-2015_2018',
    '/var/montageJungle/polytheque/1126-VideosThemeFamilles',
    '/var/montageJungle/polytheque/1127-Lille-Fives',
    '/var/montageJungle/polytheque/1128-ReportagePhoto-Appalaches',
    '/var/montageJungle/polytheque/1131-CINT-CourrielsAnimation-CJW-2011_2016',
    '/var/montageJungle/polytheque/1136-BEL_AntoineScalliet-2017_2018',
    '/var/montageJungle/polytheque/1137-FRA-DenisGendre-Detection-GpeRelaisBezonsNoisy-HAVEA-2007_2011',
    '/var/montageJungle/polytheque/1138-ASI-BGD-MatiBangladesh-Photographs',
    '/var/montageJungle/polytheque/1139',
    '/var/montageJungle/polytheque/1140-Expertise-ViolenceSilencePaix-2008_2012',
    '/var/montageJungle/polytheque/1141-ADN-USA-NewYork_UnitedNations-2010_2017',
    '/var/montageJungle/polytheque/1142-EUR-BEL-EuropeEtBelgique-JeanPierrePinet-2013_2019',
    '/var/montageJungle/polytheque/1146-OCDE-MesurePauvrete-Mai2019',
    '/var/montageJungle/polytheque/1148_03-Alternative114-Champeaux-ClaudeFerrand-1973_2008',
]


var sourceDirs = ['/var/montageJungle/polytheque/1152-ValDOiseBrigitteBourcier-1976_2019',
    '/var/montageJungle/polytheque/1156-VideosPhilippeHamel-2018_2019',
    '/var/montageJungle/polytheque/1159-OceanIndien-AlainFanchon-Courriels-2016_2017',
    '/var/montageJungle/polytheque/1162-Boespflug-Illettrisme-1971_2019',
    '/var/montageJungle/polytheque/1168-Labo-CroisementSavoirsPratiques',
    '/var/montageJungle/polytheque/1169-Pologne-2006_2019',
    '/var/montageJungle/polytheque/1171-FRA-BDR_Paris20-2016_2019',
    '/var/montageJungle/polytheque/1172-ForumEuropeenJeunesse',
    '/var/montageJungle/polytheque/1173-Europe-2008_2020',
    '/var/montageJungle/polytheque/1174-Bolivia-2010_2015',
    '/var/montageJungle/polytheque/1175-Suisse-Geneve-1979_2019',
    '/var/montageJungle/polytheque/1176-Campagne2017-1983_2018',
    '/var/montageJungle/polytheque/1178-ContratsEditeursAuteursLivres',
    '/var/montageJungle/polytheque/1183-PEPs-2015_2017',
    '/var/montageJungle/polytheque/1184-QueSommesNousDevenus-SimeonBrand-2015_2020',
    '/var/montageJungle/polytheque/1185-Dynamique-Assises-Volontariat-2014_2015',
    '/var/montageJungle/polytheque/1186-Evaluation-Campagne-StopPauvrete-2017',
    '/var/montageJungle/polytheque/1187-Luxembourg-StefaniaPetriconiGalantucci-1976_2010',
    '/var/montageJungle/polytheque/1188-INT-Benkadi-2011_2021',
    '/var/montageJungle/polytheque/1190-Suisse-MarieRose-Blunschi-1973_2011',
    '/var/montageJungle/polytheque/1191-Pays-Bas-ChristineBehain-2001_2020',
    '/var/montageJungle/polytheque/1207-DimensionsCacheesPauvrete-Consolini-2016_2021',
    // '/var/montageJungle/polytheque/Guatemala-2014_2018',
    //  '/var/montageJungle/polytheque/Guatemala-FAIT',
    // '/var/montageJungle/polytheque/Philippines-PhotosVideos-Mai-2018',
    // '/var/montageJungle/polytheque/archivage_UPQMidf'
]



async.eachSeries(sourceDirs, function (sourceDir, callbackEach) {
    console.log("--------------------------processing " + sourceDir + "----------------------------------");
    ThumbnailManagerPolytheque.buidThumbnails(sourceDir, targetDir, includeParentDirInPhotoName, params, function (err, result) {
        if (err)
            return callbackEach(err)

        callbackEach()
    })
}, function (err) {
    if (err)
        return console.log(err);

    console.log("ALL DONE")
})
