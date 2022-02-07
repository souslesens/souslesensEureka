var fs = require('fs');
var path = require('path');
var async = require('async');
const request = require("request");
const elasticRestProxy = require("./elasticRestProxy.");
const socket = require("../routes/socket");
var util = require('./backoffice/util.')
var indexer = require('./backoffice/indexer.')
var thumbnailManager = require('./thumbnailManager.')
const Jimp = require("jimp");

var PhotosScanner = {


    getDirContent: function (options, callback) {
        if (!options) {
            options = {}
        }
        var dirPath = options.topDir
        var dirPathOffest = dirPath.length
        //  var dirsArray = []
        var dirFilesMap = {}
        var rootDirName = path.basename(dirPath)
        var totalDirs = 0
        var level1DirsCount = 0

        function recurse(parent, level) {


            parent = path.normalize(parent);
            if (!fs.existsSync(parent))
                return callback("dir doesnt not exist :" + parent)

            var stats = fs.statSync(parent);
            if (!stats.isDirectory(parent)) {
                return
            }
            if (parent.charAt(parent.length - 1) != path.sep)
                parent += path.sep;


            var files = fs.readdirSync(parent);
            for (var i = 0; i < files.length; i++) {

                var fileName = parent + files[i];
                var stats = fs.statSync(fileName);
                var infos = {lastModified: stats.mtimeMs};//fileInfos.getDirInfos(dir);

                if (stats.isDirectory(fileName)) {

                    if (options.filterDirs && options.filterDirs["" + level+1]) {
                        var p = i
                        if (p < options.filterDirs["" + level].start || p > options.filterDirs["" + level].end)
                            return

                    }


                    recurse(fileName, level + 1);
                    if ((totalDirs++) % 200 == 0)
                        console.log("directories " + totalDirs)

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
                    if (!dirFilesMap[parent]) {
                        var parentDir = parent.substring(dirPathOffest)
                        var obj = {id: parentDir, files: []}

                        var parentsArray = parentDir.split('/')
                        for (var j = 0; j < parentsArray.length; j++) {
                            if (parentsArray[j] != "")
                                obj["dir" + (j + 1)] = parentsArray[j]

                        }
                        dirFilesMap[parent] = obj
                    }
                    dirFilesMap[parent].files.push(files[i])


                }
            }
        }


        //recurse each first level dir
        var dirs1 = fs.readdirSync(dirPath);
        var totalFilesIndexed = 0
        var totalDirsIndexed = 0
        var index = 0
        var t1 = new Date()
        var journal = ""
        var i = -1;
        async.eachSeries(dirs1, function (dir1, callbackEach) {
            i++;
            if (options.filterDirs && options.filterDirs["0"]) {
                // var p = options.filterDirs[0].list.indexOf(dir1)
                var p = i;
                if (p < options.filterDirs["0"].start || p > options.filterDirs["0"].end)
                    return callbackEach();

            }

            recurse(dirPath + "/" + dir1, 0);
            if (Object.keys(dirFilesMap).length == 0)
                return callbackEach()


            if (options.processor == "indexPhotosCatalog") {
                if ((index++) == 0)
                    options.deleteOldIndex = true
                else
                    options.deleteOldIndex = false
                PhotosScanner.indexPhotosCatalog(dirFilesMap, options, function (err, result) {
                    dirFilesMap = {}
                    totalFilesIndexed += result.files;
                    totalDirsIndexed += result.dirs;
                    var duration = Math.round((new Date() - t1) / 1000)
                    var message = "" + index + "/" + dirs1.length + "  processed " + dir1;
                    console.log("" + index + "/" + dirs1.length + "  processed " + dir1);
                    journal += message + "\n"
                    message = " Total  indexed : leaf directories  " + totalDirsIndexed + " ,files " + totalFilesIndexed + " in sec. " + duration
                    journal += message + "\n"
                    message = " Total  thumbnails  " + result.thumbnails.count + " in sec. " + result.thumbnails.duration
                    journal += message + "\n"


                    callbackEach();

                })
            }


        }, function (err) {
            var journalPath = options.journalDir + options.indexName + "_" + new Date() + ".txt"
            fs.writeFileSync(journalPath, journal)
            console.log(" ALL DONE")
        })
        //  return callback(null, dirFilesMap)
    },


    indexPhotosCatalog: function (photosMap, options, callback) {

        var indexName = "photos-catalog"
        if (options.indexName)
            indexName = options.indexName;


        var sliceSize = 100
        var thumbnailJournal = ""
        var t0 = new Date()
        var index1 = 0;
        console.log(Object.keys(photosMap).length)
        var totalFiles = 0
        var elasticObjs = []
        for (var key in photosMap) {
            var photos = photosMap[key];
            elasticObjs.push(photosMap[key])
        }

        async.series([
                function (callbackSeries) {
                    if (!options.deleteOldIndex) {
                        return callbackSeries()
                    }
                    var config = {
                        general: {indexName: options.indexName},
                        indexation: {
                            elasticUrl: options.elasticUrl,
                            deleteOldIndex: options.deleteOldIndex
                        },
                    };

                    indexer.deleteIndex(config, function (err, result) {
                        return callbackSeries(err)
                    })

                },
                function (callbackSeries) {
                    if (false)
                        return callbackSeries();
                    var slices = util.sliceArray(elasticObjs, sliceSize)
                    async.eachSeries(slices, function (slice, callbackEach) {

                        var bulkStr = ""
                        slice.forEach(function (item) {
                            totalFiles += item.files.length
                            bulkStr += JSON.stringify({index: {_index: indexName, _type: indexName, _id: item.id}}) + "\r\n"
                            bulkStr += JSON.stringify(item) + "\r\n";

                        })

                        //  console.log("indexing " + item.id);
                        var requestOptions = {
                            method: 'POST',
                            body: bulkStr,
                            encoding: null,
                            // timeout: 1000 * 3600 * 24 * 3, //3 days //Set your timeout value in milliseconds or 0 for unlimited
                            headers: {
                                'content-type': 'application/json'
                            },
                            url: options.elasticUrl + "_bulk?refresh=wait_for"
                        };


                        request(requestOptions, function (error, response, body) {
                            if (error) {
                                return callbackEach(error)

                            }
                            elasticRestProxy.checkBulkQueryResponse(body, function (err, result) {
                                if (err)
                                    return callbackEach(err);
                                callbackEach(error)

                            })
                        })
                    }, function (err) {
                        console.log("indexed " + totalFiles + " jpg files");
                        return callbackSeries(err)
                    })
                },
                //generate thumbnail
                function (callbackSeries) {
                    if (!options.generateThumbnails)
                        return callbackSeries();
                    if (elasticObjs.length == 0)
                        return callbackSeries();

                    thumbnailManager.getWaterMarkImage(options.thumbnailParams, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        options.thumbnailParams.watermark.image = result;
                        callbackSeries(err)
                    })

                }
                , function (callbackSeries) {
                    if (!options.generateThumbnails)
                        return callbackSeries();
                    var index1 = 0;


                    async.eachSeries(elasticObjs, function (item, callbackEach1) {
                        index2 = 0;

                        if (item.files.length == 0)
                            return callbackEach1();
                        var t1 = new Date()


                        console.log("generating thumbnails for " + item.id);

                        async.eachSeries(item.files, function (file, callbackEach2) {
                            index1 += 1
                            index2 += 1
                            var imgPath = item.id + file
                            var thumbnailPath = options.thumbnailParams.targetDir + imgPath.replace(/\//g, "|_|")


                            imgPath = options.topDir + imgPath
                            thumbnailManager.generateThumnail(imgPath, thumbnailPath, options.thumbnailParams, function (err, result) {
                                if (err)
                                    return callbackEach2(err)
                                return callbackEach2()
                            })
                        }, function (err) {
                            var duration = Math.round((new Date() - t1) / 1000)
                            var message = " generated thumbnails " + index2 + " in sec. " + duration

                            console.log(message)
                            return callbackEach1()
                        })

                    }, function (err) {

                        return callbackSeries()
                    })


                }


            ],

            function (err) {
                var duration = Math.round((new Date() - t0) / 1000)
                return callback(err, {
                    dirs: elasticObjs.length,
                    files: totalFiles,
                    thumbnails: {count: index1, duration: duration}
                })
            }
        )


    }


    ,
    polythequeDirs: ["0010-Periodique-ChoniquesComitesQM_DDH",
        "0011-Periodique-SolidariteQuartMonde_Bretagne",
        "0012-ATD_QuartMondeAlsace",
        "0013-LettreAmisBise",
        "0014-SolidariteQuartMondeNordPasCalais",
        "0015-VierdeWereledVerkenningen",
        "0016-TrompetteHospices",
        "'0017-VierdeWereld-PersrevueArmoedeMensen'",
        "0018-CriDesJeunes",
        "0019-QM_EnMarche-Versailles",
        "0020-NLD-VierdeWereld",
        "0021-FourthWorldJournal-USA",
        "0022-FourthWorldJournal-GB",
        "0023-FeuilleRoute-BEL",
        "0024-DroitQM-BEL",
        "0025-InformationATDQM-Noisy-FRA",
        "0026-FeuilleAmitie-Noisy-FRA",
        "0027-Tapori-USA",
        "0028-DossiersPierrelaye",
        "0029-NousUnPeuple-BEL",
        "0030-ConjonctureBELgique.odt",
        "'0031-PeriodiqueJeunesseQuartMonde1979-2004'",
        "0032-LettreAmisAfrique_Monde.ods",
        "0033-InformationQuartMonde-Suisse-CHE.odt",
        "0034-Tapori",
        "0035-FeuilleRoute-JournalATD_QM",
        "0037-BEL-JeunesseQM",
        "0038-RondOmBoerderij-NLD",
        "0039-Igloos-RevueQM50.7",
        "0040-RevueQM-DossiersDocs",
        "0041-PeriodiquesJeunesseQuartMonde-Champeaux",
        "0042-DynamiqueTapori",
        "0043-PeriodiquesAfriqueEtThaïlande",
        "'0044-PeriodiquesAmeriqueduNord-AmeriqueduSud'",
        "0045-Partenaire-VierdeWeltBlad-BEL",
        "0046-Publications-SuisseLuxembourg",
        "0047-Publications-PaysBas-Allemagne-Espagne-RoyaumeUni",
        "0048-PeriodiquesEquipesInternationales",
        "0049-PeriodiquesFrance",
        "0050-UniversitePopulaire-IDF",
        "0051-LettreInfoLyon",
        "0052-PeriodiquesGuatemala",
        "0119-Discernement",
        "0135-RapportsMoraux",
        "0136-livres-Publications",
        "0142_39-Allemagne-Wendt-Livre-DOr-1992_2021",
        "0229-FRA-RHA-RhoneAlpes",
        "0240_016N_03-Bordeaux",
        "'0255_047N-04-02FrimhurstHughMargaretCunningham'",
        "0296-FRA-DN-PDAC-PoleDialogueActionConnaissance",
        "0318-FRA-Nord-GroupeRelais_EquipeRegionale",
        "0345-17Octobre-2007_2009",
        "0350_23-INT-17Octobre_ComiteDalle-1987_2011",
        "0353-UP-IDF-Genevieve_Tardieu-2002_2006",
        "0481-2015-ReportagesCarmenMartos",
        "0482-2016-ReportagesCarmenMartos",
        "0483-2017-ReportagesCarmenMartos",
        "0484-2018-ReportagesCarmenMartos",
        "0485-2019-Reportages",
        "0486-2020-ReportagesCarmenMartos",
        "0492-ArchivesAudiovisuel",
        "1005-OCI-MDG-MADAGASCAR-2007_2015",
        "1006-OCI-MDG-MADAGASCAR_MMM-2009_2015",
        "1007-ADN-CAN-Canada-2011_2015",
        "1011-ArchivesAModave-AutourBeatification-2003_2014",
        "1012-ArchivesAModave-2001_2015",
        "1014_04N-ProcheOrient",
        "1017-FRA-BibliothèquesRue-Paris11-2009_2015",
        "1053-CAL-BOL-Bolivia-2013_2015",
        "1054-CAL-GTM-Guatemala-1997_2015",
        "1060-documents-evaDiscernement-2014_2015",
        "1061-GpeDiscernement-2015_2016",
        "1065-OCI-MUS-IleMaurice-2015_2016",
        "1067-MessagesEcritParGabrielleErpicum-1988_2013",
        "1069-OCI-MUS-IleMaurice-Tapori-17Oct-2003_2011",
        "1072-CeQueVousMavezAppris-YvesPetit-Lyon",
        "1074-EUR-POL-Warsaw-2013_2016",
        "1076-EUR-LUXembourg-UniversitePopulaire-2009_2014",
        "1079-AFR-CAF-Centrafrique-BANGUI-2015_2016",
        "1083_03-MED-LBN-Liban-Beitouna",
        "1088-Tapori-International-2014_2017",
        "1089-pelerinageSiloe-PierreLaPlusPrecieuse",
        "1097-FRA_PoleFormationEngagements_DN--2012_2017_VersementNumerique",
        "1098-EUR-Mobilisation2017-RassemblementJeunesseWhije",
        "1101-AFRique-DelReg-2003_2017",
        "1103-INT-Benkadi-2015_2017",
        "1104-INT-PoleExpressionsPubliquesPEPS-2009_2015",
        "1107-PAEFI-MailsPaulMarechal-2008_2017",
        "1110-TaporiInternational",
        "1111-FRAnce-DelegNationale-2003-2013",
        "1112-FRA-FRC-LaBise",
        "1115-CINT-ArrierePays-2016_2018",
        "1116-AnneeSabbatique-DenisGendre-2006_2007",
        "1117-EUR-BEL-UniversitePopulaireBruxelles-2010_2017",
        "1118",
        "1119-Videos-PhilippeHamel-2015_2018",
        "1126-VideosThemeFamilles",
        "1127-Lille-Fives",
        "1128-ReportagePhoto-Appalaches",
        "1131-CINT-CourrielsAnimation-CJW-2011_2016",
        "1136-BEL_AntoineScalliet-2017_2018",
        "1137-FRA-DenisGendre-Detection-GpeRelaisBezonsNoisy-HAVEA-2007_2011",
        "1138-ASI-BGD-MatiBangladesh-Photographs",
        "1139",
        "1140-Expertise-ViolenceSilencePaix-2008_2012",
        "1141-ADN-USA-NewYork_UnitedNations-2010_2017",
        "1142-EUR-BEL-EuropeEtBelgique-JeanPierrePinet-2013_2019",
        "1146-OCDE-MesurePauvrete-Mai2019",
        "1148_03-Alternative114-Champeaux-ClaudeFerrand-1973_2008",
        "1152-ValDOiseBrigitteBourcier-1976_2019",
        "1156-VideosPhilippeHamel-2018_2019",
        "1159-OceanIndien-AlainFanchon-Courriels-2016_2017",
        "1162-Boespflug-Illettrisme-1971_2019",
        "1168-Labo-CroisementSavoirsPratiques",
        "1169-Pologne-2006_2019",
        "1171-FRA-BDR_Paris20-2016_2019",
        "1172-ForumEuropeenJeunesse",
        "1173-Europe-2008_2020",
        "1174-Bolivia-2010_2015",
        "1175-Suisse-Geneve-1979_2019",
        "1176-Campagne2017-1983_2018",
        "1178-ContratsEditeursAuteursLivres",
        "1183-PEPs-2015_2017",
        "1184-QueSommesNousDevenus-SimeonBrand-2015_2020",
        "1185-Dynamique-Assises-Volontariat-2014_2015",
        "1186-Evaluation-Campagne-StopPauvrete-2017",
        "1187-Luxembourg-StefaniaPetriconiGalantucci-1976_2010",
        "1188-INT-Benkadi-2011_2021",
        "1190-Suisse-MarieRose-Blunschi-1973_2011",
        "1191-Pays-Bas-ChristineBehain-2001_2020",
        "1207-DimensionsCacheesPauvrete-Consolini-2016_2021"
    ]

}
module.exports = PhotosScanner


if (true) {


    var options = {
      /*  filterDirs: {
            "0": {start: 2, end: 10},
          //  "1": {start: 28, end: 82}

        },*/
   //   topDir: "/var/montageJungle/polytheque/",
      // topDir: "/var/montageJungle/artotheque/FONDS/",
      topDir: "/var/montageJungle/Arto/FONDS/",
        processor: "indexPhotosCatalog",
        acceptedExtensions: ["jpg", "JPG", "JPEG", "jpeg"],//, "odt", "ods", "ODT", "ODS"],
        elasticUrl: elasticRestProxy.getElasticUrl(),
        indexName: "photos-catalog-artotheque",
        deleteOldIndex: true,
       // generateThumbnails: true,
        journalDir: "/home/claude/"


    }
    var watermarkPath = path.join(__dirname, "../config/filigranes/logoseul-transparent.png")
    watermarkPath = path.resolve(watermarkPath)


    var thumbnailParams = {
        targetDir: "/var/miniaturesPhotos2/artotheque/",
        width: 480,
        quality: 80,
        acceptedExtensions: ["jpg"],
        watermark: {
            path: watermarkPath,
            'ratio': 0.5,// Should be less than one
            'opacity': 0.20, //Should be less than one
        }
    }
    options.thumbnailParams = thumbnailParams

    PhotosScanner.getDirContent(options, function (err, result) {
        if (err)
            return console.log(err)

        // fs.writeFileSync("/home/claude/poltythequeTest.json",JSON.stringify(result,null,2))
    })
}


//queries
var aggr =
    {
        "aggs": {
            "types_count": {"terms": {"field": "dir1"}}
        }
    }



