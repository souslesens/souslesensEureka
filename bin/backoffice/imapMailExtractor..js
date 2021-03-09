var Imap = require('imap');
var inspect = require('util').inspect;
var async = require('async');
var fs = require('fs');
var path = require('path');

var  common = require('./common..js');
var imapCrawler=require("./_imapCrawler..js")


//var common = require('./common.js')
var socket = require('../../routes/socket.js');

var chardet = require('chardet');
var iconv = require('iconv-lite');
var libmime = require('libmime');
var base64Stream = require('base64-stream');
//var base64 = require('base-64');
//var utf8 = require('utf8');
var streams = require('memory-streams');
var AllHtmlEntities = require('html-entities').AllHtmlEntities;




///var htmlEntities = new AllHtmlEntities();
var clientSocketMessages = {};
var mailsToIndex = [];
//var StringBuilder = require('node-stringbuilder');


process.setMaxListeners(0);


var imapMailExtractor = {
    listMails: false,
    deleteDirAfterZip: true,
    archivePrefix: "pdfMailArchive",
    archiveMaxSize: 1000 * 1000 * 1000,//1000MO,
    //  archiveMaxSize: 1000 * 1000,//1000MO,
    maxMessageSize: 1000 * 1000 * 5,
    maxAttachmentsSize: 1000 * 1000 * 5,
    minAttachmentsSize: 0, //pour filtrer les images signature
    pdfArchiveDir: "./pdfs",
    host: 'imap.atd-quartmonde.org',
    port: 993,
    skippedFolders: ["Autres utilisateurs", "Dossiers partagés"],
    attachmentsExcluded: {
        names: ["logosignature.png", "atd_slogan.png"],
        smallerThan: 10000,
        extensions: ["jpg", "png", "gif", "asc", "vcf"]
    },


    getImapConn: function (imapServer, mailAdress, password) {

        var imapServerPort;
        var imapServerHost;
        if (!imapServer) {
            imapServerHost = imapMailExtractor.host;
            imapServerPort = imapMailExtractor.port

        } else {
            if (imapServer == "") {
                return null;
            }
            if (imapServer.indexOf(":") < 0) {
                imapServerHost = imapServer;
                imapServerPort = 993;
            } else {

                var array = imapServer.split(":");
                imapServerHost = array[0];
                imapServerPort = array[1];
            }
        }
        var imap = new Imap({
            user: mailAdress,
            password: password,
            host: imapServerHost,
            port: imapServerPort,
            connTimeout: 30000,
            authTimeout: 30000,
            tls: true
        });
        return imap;
    },


    getFolderHierarchy: function (imapServer, mailAdress, password, rootFolder, folderId, callback) {

        var imap = imapMailExtractor.getImapConn(imapServer, mailAdress, password);
        var leafFolder = rootFolder;
        var folderAncestors = null;
        if (rootFolder) {
            folderAncestors = rootFolder.split("/");
            var p = rootFolder.lastIndexOf("/");
            if (p > -1)
                leafFolder = rootFolder.substring(p + 1);
        }

        imap.once('ready', function () {
            imap.getBoxes([], function (err, result) {
                if (err)
                    return callback(err);

                var tree = [];
                var id = 1000;
                var stop = false;

                function recurse(idParent, object, ancestors, parentPath) {


                    for (var key in object) {
                        if (stop == true)
                            return;
                        if (!rootFolder || rootFolder.indexOf(key) > -1 || ancestors.indexOf(leafFolder) > -1) {

                            id += 1;
                            var ancestors2 = ancestors.slice(0);
                            ancestors2.push(key)
                            tree.push({parent: idParent, id: id, text: key, ancestors: ancestors2});
                            parentPath += "/" + key

                            if (folderId && folderId == id)
                                return stop = true;
                            recurse(id, object[key].children, ancestors2, parentPath)
                        }
                    }


                }

                recurse("#", result, [], "");


                return callback(null, tree);
            });


        }).once('error', function (err) {
            console.log('Fetch error: ' + err.message);
            callback(err.message);
        }).once('end', function () {
            imap.end();
        });
        imap.once('error', function (err) {
            console.log('Fetch error: ' + err.message);
            //   callback(err.message);
        })
        imap.connect();
    }
    ,

    decodeChunk: function (chunk, partEncoding, charset) {

        //https://emn178.github.io/online-tools/md2.html

        //  var nodeEncodings=["BASE64","ASCII","UTF-8",]
        function decodeQuotedPrintable(chunk, charset) {
            // str = (str || '').toString().// remove invalid whitespace from the end of lines

            if (charset.length > 0 && charset != 'UTF-8') {
                try {
                    var str = iconv.decode(chunk, charset);
                } catch (e) {

                    str = chunk.toString('utf8');
                }

            } else {
                str = chunk.toString('utf8');
            }


            // str = chunk.toString('utf8')
            str = str.replace(/[\t ]+$/gm, '').// remove soft line breaks
            replace(/\=(?:\r?\n|$)/g, '');

            var encodedBytesCount = (str.match(/\=[\da-fA-F]{2}/g) || []).length,
                bufferLength = str.length - encodedBytesCount * 2,
                chr, hex,
                buffer = new Buffer(bufferLength),
                bufferPos = 0;

            for (var i = 0, len = str.length; i < len; i++) {
                chr = str.charAt(i);
                if (chr === '=' && (hex = str.substr(i + 1, 2)) && /[\da-fA-F]{2}/.test(hex)) {
                    if (hex == "E9") {

                        var x = parseInt(hex, 16);
                    }
                    buffer[bufferPos++] = parseInt(hex, 16);
                    i += 2;
                    continue;
                }
                buffer[bufferPos++] = chr.charCodeAt(0);
            }
            var str2;
            if (charset.length > 0 && charset != 'UTF-8') {
                try {
                    var str2 = iconv.decode(buffer, charset);
                } catch (e) {

                    str2 = buffer.toString('utf8');
                }

            } else {
                str2 = buffer.toString('utf8');
            }
            str2 = htmlEntities.decode(str2);
            return str2;
        }

        var str = "";

        if (!charset)
            var charset = chardet.detect(chunk);
        if (partEncoding)
            partEncoding = partEncoding.toUpperCase();

        if (partEncoding == "QUOTED-PRINTABLE") {
            str = decodeQuotedPrintable(chunk, charset);
            return str;

        }

        if (charset.length > 0 && charset != 'UTF-8') {
            try {
                var str = iconv.decode(chunk, charset);
            } catch (e) {

                str = chunk.toString('utf8');
            }

        } else {
            str = chunk.toString('utf8');
        }
        str = libmime.decodeWords(str)
        return str;

    }
    ,


    getPartsInfos: function (parts, _infos, messageSeqno) {
        var infos = _infos || [];
        infos.totalSize = infos.totalSize || 0;
        infos.validAttachmentsSize = infos.validAttachmentsSize || 0;
        infos.validAttachments = infos.validAttachments || {};
        infos.rejectedAttachments = infos.rejectedAttachments || {};
        infos.rejectedAttachmentsSize = infos.rejectedAttachmentsSize || 0;
        infos.textPartIds = infos.textPartIds || [];
        infos.htmlPartIds = infos.htmlPartIds || [];
        infos.validTextsOrHtmls = infos.validTextsOrHtmls || {};

        for (var i = 0; i < parts.length; ++i) {
            if (Array.isArray(parts[i])) {
                infos = imapMailExtractor.getPartsInfos(parts[i], infos, messageSeqno);
            } else {
                if (parts[i].disposition && ['INLINE', 'ATTACHMENT'].indexOf(parts[i].disposition.type) > -1) {
                    var partSubType = parts[i].subtype;
                    if (partSubType)
                        partSubType = parts[i].subtype.toUpperCase();
                    if (partSubType == "HTML")
                        infos.htmlPartIds.push(parts[i].partID);
                    else if (partSubType == "PLAIN") {
                        infos.textPartIds.push(parts[i].partID);
                    } else {
                        parts[i].type = "attachment";
                        if (parts[i].size) {

                            if (parts[i].size <= imapMailExtractor.maxAttachmentsSize && parts[i].size > imapMailExtractor.minAttachmentsSize) {

                                infos.validAttachments[parts[i].partID] = parts[i];
                                infos.validAttachmentsSize += parts[i].size;
                            } else {
                                infos.rejectedAttachments[parts[i].partID] = parts[i];
                                infos.rejectedAttachmentsSize += parts[i].size;
                            }
                        }
                    }


                } else if (parts[i].type == 'image') {
                    if (parts[i].size) {

                        if (parts[i].size <= imapMailExtractor.maxAttachmentsSize && parts[i].size > imapMailExtractor.minAttachmentsSize) {

                            infos.validAttachments[parts[i].partID] = parts[i];
                            infos.validAttachmentsSize += parts[i].size;
                        } else {
                            infos.rejectedAttachments[parts[i].partID] = parts[i];
                            infos.rejectedAttachmentsSize += parts[i].size;
                        }
                    }
                } else {


                    if (parts[i].size)
                        infos.totalSize += parts[i].size;
                    if (parts[i].partID) {
                        if (parts[i].subtype) {
                            var partSubType = parts[i].subtype.toUpperCase();
                            var charset = null;
                            if (parts[i].params)
                                charset = parts[i].params.charset;
                            infos.validTextsOrHtmls[parts[i].partID] = {encoding: parts[i].encoding, charset: charset}
                            if (partSubType == "HTML")
                                infos.htmlPartIds.push(parts[i].partID);
                            else if (partSubType == "PLAIN") {
                                infos.textPartIds.push(parts[i].partID);
                            } else {

                            }
                        } else {

                        }
                    }
                }
                infos.push(parts[i]);
            }

        }
        return infos;


    }
    ,
    parseMessageHeader: function (chunks) {
        //processing header metadata
        var obj = {}
        var headersStr = imapMailExtractor.decodeChunk(chunks);
        headersStr = headersStr.replace(/\r/g, "");

        var lines = headersStr.split("\n")
        var multiLineStr = "";
        var toRemove = []
        for (var i = (lines.length - 1); i > 0; i--) {
            var p = lines[i].indexOf(":");
            if (p < 0) {
                lines[i - 1] += lines[i];

            }
        }
        for (var i = 0; i < lines.length; i++) {
            var p = lines[i].indexOf(":");
            if (p > -1) {
                var key = lines[i].substring(0, p);
                var value = lines[i].substring(p + 1);
                obj[key] = value;
            }
        }
        return obj;
    }

    ,
    getFolderMailsInfos: function (imapServer, mailAdress, password, folder, callback1) {

        var messages = {
            _globalInfo: {
                totalSize: 0,
                mailsCount: 0,
                validMailsCount: 0,
                attachmentsSize: 0
            }
        };
        var imap = imapMailExtractor.getImapConn(imapServer, mailAdress, password);
        imap.once('ready', function () {
            imap.openBox(folder, true, function (err, box) {
                if (err) {
                    console.log(err);
                    return callback1(err)
                }
                var folderCountMessages = 0;
                var headerFields = 'HEADER.FIELDS (TO FROM SUBJECT DATE SENDER CC REPLY-TO)'
                //   All functions below have sequence number-based counterparts that can be accessed by using the 'seq' namespace of the imap connection's instance (e.g. conn.seq.search() returns sequence number(s) instead of UIDs, conn.seq.fetch() fetches by sequence number(s) instead of UIDs, etc):


                imap.seq.search([['LARGER', 1]], function (err, results) {
                    // imap.search([['LARGER', 1]], function (err, results) {
                    if (results.length == 0)
                        return callback1(null, messages);


                    //results = [196];


                    var f = imap.seq.fetch(results, {
                        bodies: headerFields,
                        //  bodies: ['HEADER.FIELDS (SUBJECT)', 'TEXT'],
                        struct: true
                    });

                    f.on('message', function (msg, seqno) {
                        messages[seqno] = {};
                        var chunks = [];
                        //  message.seqno = seqno;
                        var subject = "";
                        msg.on('body', function (stream, info) {
                            if (info.which == headerFields) {
                                //  if (info.which == 'HEADER.FIELDS (SUBJECT)') {
                                stream.on('data', function (chunk) {
                                        chunks.push(chunk);
                                    }
                                );


                                stream.once('end', function () {


                                });
                            }
                        });
                        msg.once('attributes', function (attrs) {


                            messages[seqno].infos = imapMailExtractor.getPartsInfos(attrs.struct, null, seqno);

                            var totalSize = messages[seqno].infos.totalSize;
                            var attachmentsSize = messages[seqno].infos.validAttachmentsSize;
                            messages._globalInfo.totalSize += totalSize;
                            if (totalSize <= imapMailExtractor.maxMessageSize)
                                messages._globalInfo.validMailsCount += 1;
                            messages._globalInfo.mailsCount += 1;
                            messages._globalInfo.attachmentsSize += attachmentsSize;


                        });
                        msg.once('end', function () {
                            var headerObj = imapMailExtractor.parseMessageHeader(Buffer.concat(chunks));

                            folderCountMessages += 1;
                            // console.log("-\t" + folderCountMessages + " \t" + headerObj.Subject);
                            messages[seqno].headers = headerObj;

                            if (messages[seqno].infos.rejectedAttachmentsSize > imapMailExtractor.minAttachmentsSize) {
                                var rejectedAttachments = messages[seqno].infos.rejectedAttachments;
                                var header = messages[seqno].headers;
                                for (var key in rejectedAttachments) {
                                    if (rejectedAttachments[key].size > imapMailExtractor.maxAttachmentsSize) {
                                        var attachmentName = imapMailExtractor.getAttachmentFileName(headerObj, rejectedAttachments[key]);
                                        imapMailExtractor.sendSocketMessage(mailAdress, "<span class='rejected' >Attachment rejected , too Big  : " + attachmentName + ", size " + common.roundToMO(rejectedAttachments[key].size) + " MO.</span>");
                                    }
                                }
                            }


                        });


                    });
                    f.once('error', function (err) {
                        console.log('Fetch error: ' + err.message);
                        // return callback1(null);
                    });
                    f.once('end', function () {
                        return callback1(null, messages)
                        imap.end();
                    });
                });
            });


        })
        imap.once('error', function (err) {
            console.log('Fetch error: ' + err.message);
            //   return callback1(err.message);
        })
        imap.connect();

    }
    ,

    processFolderPdfs: function (imapServer, mailAdress, password, folder, folderInfos, pdfArchiveFolderPath, withAttachments, startTime, indexElastic, callback0) {

        var totalArchiveSize = folderInfos.totalArchiveSize;
        var totalArchiveCountMails = folderInfos.totalArchiveCountMails;
        var messages = [];
        messages.folderSize = 0;
        var partsInfos = folderInfos.partsInfos;
        var i = 0;
        var imap = imapMailExtractor.getImapConn(imapServer, mailAdress, password);
        imap.once('ready', function () {
            imap.openBox(folder, true, function (err, box) {
                if (err) {
                    console.log(err);
                    return callback0(err)
                }

                //  imap.search([['SMALLER', 5000]], function (err, results) {

                //   All functions below have sequence number-based counterparts that can be accessed by using the 'seq' namespace of the imap connection's instance (e.g. conn.seq.search() returns sequence number(s) instead of UIDs, conn.seq.fetch() fetches by sequence number(s) instead of UIDs, etc):
                imap.seq.search([['LARGER', 1]], function (err, results) {
                    if (results.length == 0)
                        return callback0(null, []);
                    var folderCountMessages = 0;
//results = [196];
                    async.eachSeries(results, function (messageSeqno, callbackEachMessage) {


                        var seqBodies = [];
                        var validAttachments = folderInfos[messageSeqno].infos.validAttachments;


                        // on ne fetcthe que les parts ids de texte
                        // on prefere le html
                        seqBodies = folderInfos[messageSeqno].infos.htmlPartIds;
                        //   console.log(JSON.stringify(seqBodies))
                        if (seqBodies.length == 0 || indexElastic)
                            seqBodies = folderInfos[messageSeqno].infos.textPartIds;
                        if (seqBodies.length == 0) {
                            console.log("no body in message " + messageSeqno);
                            return callbackEachMessage();
                        }
                        var messageTextOrHtmlPartsCount = seqBodies.length;

                        var messageTextOrHtmlPartsIndex = 0;
                        var messageTextOrHtmlContent = "";
                        if (withAttachments) {
                            seqBodies = seqBodies.concat(Object.keys(validAttachments));

                        }

                        if (seqBodies.length == 0)
                            return callbackEachMessage();


                        folderCountMessages += 1;


                        //*****************************FETCH each mail one after other : when pdf is writen *************************
                        //***********************************************************************

                        var message = folderInfos[messageSeqno].headers;

                        message.text = "";

                        var f = imap.seq.fetch(messageSeqno, {
                            bodies: seqBodies,
                            struct: false
                        });
                        var encoding;
                        var charset;
                        var isBase64Message = false;
                        f.on('message', function (msg, seqno) {
                            var isAttachement = false;


                            msg.on('body', function (stream, info) {
                                //   console.log(message.Subject + "_" + messageSeqno + "_" + info.which)


                                //  message.Subject = messageSeqno + "_" + info.which + "_" + message.Subject;
                                if (folderInfos[messageSeqno].infos.validTextsOrHtmls[info.which]) {
                                    encoding = folderInfos[messageSeqno].infos.validTextsOrHtmls[info.which].encoding;
                                    charset = folderInfos[messageSeqno].infos.validTextsOrHtmls[info.which].charset;
                                }


                                messages.folderSize += info.size;
                                totalArchiveSize += info.size;


                                //process Attachments
                                if (withAttachments && validAttachments[info.which]) {
                                    isAttachement = true;
                                    var attachmentInfos = validAttachments[info.which];

                                    var file = imapMailExtractor.getAttachmentFileName(message, attachmentInfos, pdfArchiveFolderPath);

                                    if (file && stream) {
                                        //https://stackoverflow.com/questions/25247207/how-to-read-and-save-attachments-using-node-imap/25281153
                                        var writeStream = fs.createWriteStream(file);

                                        writeStream.on('finish', function () {
                                            //  console.log(' Done writing to file ' + file)
                                        })

                                        try {
                                            if (attachmentInfos.encoding === 'BASE64')

                                                stream.pipe(base64Stream.decode()).pipe(writeStream);
                                            else stream.pipe(writeStream)
                                        } catch (e) {
                                            console.log(e);
                                        }
                                    }
                                } else {

                                    isAttachement = false;
                                }

                                //special processing for messages base64 encoded
                                if (isAttachement == false && encoding == "BASE64") {

                                    isBase64Message = true;
                                    var writeStream = new streams.WritableStream();
                                    stream.once('end', function () {
                                        message.text = writeStream.toString();
                                    })

                                    try {
                                        stream.pipe(base64Stream.decode()).pipe(writeStream);
                                    } catch (e) {
                                        console.log(e);
                                        imapMailExtractor.sendSocketMessage(mailAdress, "<span class='rejected'>cannot generate PDF for message " + message.date + "_" + message.Subject + "</span>")
                                    }


                                }

                                if (isAttachement === false && isBase64Message === false) {


                                    var chunks = [];
                                    stream.on('data', function (chunk) {

                                        try {
                                            chunks.push(chunk);

                                        } catch (e) {
                                            console.log("ERROR " + message.Date + "_" + message.Subject + "\\n" + e);
                                            imapMailExtractor.sendSocketMessage(mailAdress, "<span class='rejected'>cannot generate PDF for message " + message.date + "_" + message.Subject + "</span>")
                                        }
                                    });
                                    stream.once('end', function () {

                                        messageTextOrHtmlPartsIndex += 1;
                                        // !!!!!!!!!!!determination de l'encodage du buffer pour le transformer en UTF8
                                        // case where several html or text parts in same email concat parts
                                        messageTextOrHtmlContent += imapMailExtractor.decodeChunk(Buffer.concat(chunks), encoding, charset);
                                        ;


                                    });
                                }
                            });
                            msg.once('attributes', function (attrs) {
                                message.attributes = attrs.uid;
                            });
                            msg.once('end', function () {
                                //   if (folderCountMessages % 10 == 0) {
                                folderInfos.processedMails += 1;
                                if (folderInfos.processedMails % 10 == 0) {

                                    var totalDuration = Math.round((new Date() - startTime) / 1000);
                                    imapMailExtractor.sendSocketMessage(mailAdress, "__" + folderCountMessages + " messages read from  folder " + folder + " " + common.roundToMO(messages.folderSize) + "MO.<br>Total messages processed :" + folderInfos.processedMails + "in " + totalDuration + " sec.<br> Total archive : count " + totalArchiveCountMails + ", size  " + common.roundToMO(totalArchiveSize) + "MO");
                                }


                            });
                        });
                        f.once('error', function (err) {
                            imapMailExtractor.sendSocketMessage(mailAdress, "<span class='rejected'> 1 mail rejected reason :" + err.message + "</span>");
                            console.log('Fetch error: ' + err.message);
                            //  callback0(err.message);
                            callbackEachMessage(err);
                        });
                        f.once('end', function () {
                            if (isBase64Message === false) {
                                message.text += messageTextOrHtmlContent;
                            }
                            message.validAttachments = imapMailExtractor.getAtttachmentNames(folderInfos[messageSeqno].infos.validAttachments);
                            message.rejectedAttachments = imapMailExtractor.getAtttachmentNames(folderInfos[messageSeqno].infos.rejectedAttachments);


                            /* if (encoding == "QUOTED-PRINTABLE") {
                                 console.log(message.text)
                             }
                             return callbackEachMessage();*/


                            if (err) {
                                imapMailExtractor.sendSocketMessage(mailAdress, "<span class='rejected'>error while generating PDF  : " + err + "</span>");
                            }
                            //  totalArchiveCountMails += 1;


                            if (indexElastic) {
                                mailsToIndex.push(message);
                                return callbackEachMessage();
                            } else {
                                mailPdfGeneratorHtml.createMailPdf(pdfArchiveFolderPath, message, function (err, result) {

                                    if (err) {
                                        imapMailExtractor.sendSocketMessage(mailAdress, "<span class='rejected'>error while generating PDF  : " + err + "</span>");
                                    }
                                    //  totalArchiveCountMails += 1;
                                    messages.count++;
                                    return callbackEachMessage();
                                })
                            }


                        });

                    }, function (err) {// end eachMessage
                        if (err)
                            callback0(err)

                        return callback0(null, messages)
                        imap.end();
                    });
                });

            });


        });
        imap.once('error', function (err) {
            console.log('Fetch error: ' + err.message);
            //  callback0(err.message);
        })
        imap.connect();

    }
    ,


//generateFolderHierarchyMessages: function (imapServer, mailAdress, password, rootFolder, folderId, withAttachments, scanOnly, callback) {

    generateMultiFoldersHierarchyMessages: function (config, callback) {



        var imapServer= config.connector.imapServerUrl;
        var mailAdress=config.connector.emailAdress;
        var password=config.connector.emailpassword
        var rootFolders= config.connector.rootBox;
        var folderIds=[config.connector.rootBox];
        var withAttachments=false;
        var scanOnly=false;
        var indexElastic=config.general.indexName;




        if (!Array.isArray(folderIds))
            folderIds = [folderIds];
        if (!Array.isArray(rootFolders))
            rootFolders = [rootFolders];

        //set pdf files root path
     /*   var pdfArchiveRootPath = imapMailExtractor.pdfArchiveDir + "/" + imapMailExtractor.archivePrefix + "_" + mailAdress.replace("@", "-At-") + "_" + Math.round(Math.random() * 100000);
        pdfArchiveRootPath = path.resolve(pdfArchiveRootPath);
        if (!fs.existsSync(pdfArchiveRootPath)) {
            fs.mkdirSync(pdfArchiveRootPath);
        }*/
        var index = 0;
        var allResults = [];
        async.eachSeries(folderIds, function (folderId, callbackEach) {
                var rootFolder = rootFolders[index++];
                imapMailExtractor.generateFolderHierarchyMessages(config, function (err, result) {
                    if (err) {
                        return callbackEach(err);
                    }
                    var endFolderMessage = "Total mails Processed : " + result.archiveTotalValidMails + " in " + result.totalDuration + "sec,  size:" + common.roundToMO(result.archiveAttachmentsSize) + "MO";
                    imapMailExtractor.sendSocketMessage(mailAdress, endFolderMessage)
                    // imapMailExtractor.storeSocketMessage(mailAdress, endFolderMessage);

                    allResults.push(result)
                   return callbackEach(null)
                })

            },
            function (err) {// at the end of processing all folders
                if (err) {
                    return callback(err);
                }

                var xx = allResults;
                var totalDuration = 0;
                var archiveTotalValidMails = 0;
                var archiveTotalRejectedMails = 0;
                var archiveTotalSize = 0;
                var archiveAttachmentsSize = 0;
                allResults.forEach(function (line) {
                    totalDuration += line.totalDuration;
                    archiveTotalValidMails += line.archiveTotalValidMails;
                    archiveTotalRejectedMails += line.archiveTotalRejectedMails;
                    archiveTotalSize += line.archiveTotalSize;
                    archiveAttachmentsSize += line.archiveAttachmentsSize;

                })
                var text = "";
                if (scanOnly)
                    text = "Archive scan  result :";

                text += "<br>Total mails  :" + (archiveTotalValidMails + archiveTotalRejectedMails) +
                    "<br>Total archive size  :" + common.roundToMO(archiveTotalSize) + "MO" +
                    "<br>Total attachments size  :" + common.roundToMO(archiveAttachmentsSize) + "MO"

                if (scanOnly) {
                    var status = "okAll";
                    if (archiveTotalSize > imapMailExtractor.archiveMaxSize) {
                        text = "<span class='rejected'><B>Archive exceeds max allowed size ( " + common.roundToMO(imapMailExtractor.archiveMaxSize) + "MO)" + "<br>try  with smaller subfolder  or contact administrator</B></span><br>" + text;
                        status = "ko";
                    } else if (archiveTotalSize + archiveAttachmentsSize > imapMailExtractor.archiveMaxSize) {
                        text = "<span class='rejected'><B>Archive with attachments exceeds max allowed size (" + common.roundToMO(imapMailExtractor.archiveMaxSize) + "MO)" + "<br> you can  process an archive without attachments, or try with smaller subfolder or contact administrator</B></span><br>" + text;
                        status = "okMessagesOnly"
                    }
                    return callback(null, {
                        text: text,
                        status: status

                    })
                }

                var endMessage = "Total mails Processed : " + archiveTotalValidMails + " in " + totalDuration + "sec, preparing zip download, size:" + common.roundToMO(archiveAttachmentsSize) + "MO" + "<br>" + text;
                var listMails = false;
                if (listMails) {
                    fs.writeFileSync(pdfArchiveRootPath + "/mailsList.txt", mailListSb);
                    imapMailExtractor.sendSocketMessage(mailAdress, endMessage)
                    imapMailExtractor.storeSocketMessage(mailAdress, pdfArchiveRootPath);
                }




            }
        )
    }

    ,

    generateFolderHierarchyMessages: function (config, callback) {

        var imapServer= config.connector.imapServerUrl;
        var mailAdress=config.connector.emailAdress;
        var password=config.connector.emailpassword
        var rootFolder= config.connector.rootBox;
        var folderId=config.connector.rootBox;
        var withAttachments=false;
        var scanOnly=false;
        var indexElastic=config.general.indexName;







        var listMails = imapMailExtractor.listMails;
        var archivePath = null;
        var leafFolder = rootFolder;
        var archiveAttachmentsSize = 0;
        var archiveTotalSize = 0;
        var totalMails = 0;
        var archiveTotalValidMails = 0;
        var archiveTotalRejectedMails = 0;
        var startTime = new Date();
        imapMailExtractor.initSocketMessage(mailAdress);

        if (rootFolder) {
            var p = rootFolder.lastIndexOf("/");
            if (p > -1)
                leafFolder = rootFolder.substring(p + 1);
        }
        var message = " start extracting messages from " + leafFolder;
        imapMailExtractor.sendSocketMessage(mailAdress, message);


        //set pdf files root path
        /*  var pdfArchiveRootPath = imapMailExtractor.pdfArchiveDir + "/" + imapMailExtractor.archivePrefix + "_" + mailAdress + "_" + Math.round(Math.random() * 100000);
          pdfArchiveRootPath = path.resolve(pdfArchiveRootPath);
          if (!fs.existsSync(pdfArchiveRootPath)) {
              fs.mkdirSync(pdfArchiveRootPath);
          }*/


        imapMailExtractor.getFolderHierarchy(imapServer, mailAdress, password, rootFolder, folderId, function (err, folders) {
            var output = [];
            var mailListSb = "";// new StringBuilder('Hi');
            var processedMails = 0;

            async.eachSeries(folders, function (folder, callbackEachFolder) {
                // on ne traite pas les boites partagées (fausses racinbes qui font planter)
                if (imapMailExtractor.skippedFolders.indexOf(folder.text) > -1) {
                    return callbackEachFolder();
                }

                //on ne traite pas  les dossiers parents
                if (folder.text != leafFolder && folder.ancestors.indexOf(leafFolder) < 0)
                    return callbackEachFolder();


                var box = "";
                for (var i = 0; i < folder.ancestors.length; i++) {
                    if (i > 0)
                        box += "/";
                    box += folder.ancestors[i];
                }

                var text = " looking for mails in folder " + box;
                imapMailExtractor.sendSocketMessage(mailAdress, text);

                var folderInfos = [];
                var validMessages = [];

                if (listMails) {
                    mailListSb += ("\n" + box + "\t");
                }

                mailsToIndex = [];
                async.series([

                    function (callbackSerie) {//getting headers and metadata
                        imapMailExtractor.getFolderMailsInfos(imapServer, mailAdress, password, box, function (err, messages) {
                            if (err) {
                                return callbackSerie(err);
                            }
                            archiveAttachmentsSize += messages._globalInfo.attachmentsSize;
                            archiveTotalSize += messages._globalInfo.totalSize;
                            archiveTotalValidMails += messages._globalInfo.validMailsCount;

                            if (true || scanOnly) {
                                var text = "<hr><B>" + folder.text +
                                    " count :" + messages._globalInfo.validMailsCount + " / " + (messages._globalInfo.mailsCount) +
                                    " size :" + common.roundToMO(messages._globalInfo.totalSize) + " / " + common.roundToMO(messages._globalInfo.attachmentsSize) + " MO.of attachments";
                                if (listMails) {
                                    for (var key in messages) {
                                        if (messages[key].headers)
                                            mailListSb += ("\n\t" + key + "\t" + JSON.stringify(messages[key].headers));
                                    }

                                }
                                imapMailExtractor.sendSocketMessage(mailAdress, text);
                            }

                            var totalSize = messages._globalInfo.totalSize;
                            if (withAttachments)
                                totalSize += archiveAttachmentsSize;
                            //   if (!scanOnly && archiveAttachmentsSize > imapMailExtractor.archiveMaxSize) {
                            if (!scanOnly && totalSize > imapMailExtractor.archiveMaxSize) {
                                var text = "Operation aborted : maximum size of archive reached :" + Math.round(messages._globalInfo.totalSize / 1000000) + "/" + Math.round(imapMailExtractor.archiveMaxSize / 1000000) + "MO"
                                imapMailExtractor.sendSocketMessage(mailAdress, text);
                                imapMailExtractor.deleteFolderRecursive(pdfArchiveRootPath);
                                return callbackSerie(text);


                            }

                            folderInfos = messages;
                            return callbackSerie(null, folderInfos);
                        })
                    },


                    function (callbackSerie2) {//extraction des mails bruts
                        if (scanOnly) {
                            return callbackSerie2(null);

                        }

                        // create archive pdf dir;
                        var start = folder.ancestors.indexOf(leafFolder)
                        if (start < 0)
                            return callbackSerie2(null);

                        var pdfArchiveFolderPath="";
                        /*     var pdfArchiveFolderPath = pdfArchiveRootPath;
                             for (var i = start; i < folder.ancestors.length; i++) {
                                 pdfArchiveFolderPath += "/" + folder.ancestors[i];
                                 var dir = path.resolve(pdfArchiveFolderPath)
                                 if (!fs.existsSync(dir)) {
                                     fs.mkdirSync(dir);
                                 }

                             }
                             //  console.log(pdfArchiveFolderPath);*/


                        folderInfos.totalArchiveSize = archiveTotalSize;
                        folderInfos.totalArchiveCountMails = archiveTotalValidMails;
                        folderInfos.processedMails = processedMails;


                        imapMailExtractor.processFolderPdfs(imapServer, mailAdress, password, box, folderInfos, pdfArchiveFolderPath, withAttachments, startTime, indexElastic, function (err, messages) {
                            processedMails += messages.count;
                            if (err) {
                                return callbackSerie2(err);
                            }
                            validMessages = messages;

                            return callbackSerie2(null, folderInfos);
                        })
                    }
                ], function (err, result) {
                    if (err) {
                        return callbackEachFolder(err)
                    }
                    if (indexElastic) {
                        imapCrawler=require("./_imapCrawler..js")
                        imapCrawler.indexJsonArray(config,mailsToIndex, function (err, result) {
                            if (err) {
                                return callbackEachFolder(err)
                            }
                            return callbackEachFolder();
                        });
                    } else
                        return callbackEachFolder();
                })


            }, function (err) {// endEachFolder
                var totalDuration = Math.round((new Date() - startTime) / 1000);
                if (err) {
                    console.log(err);
                    return callback(err);
                }
                var text = "";
                if (scanOnly)
                    text = "Archive scan  result :";

                text += "<br>Total mails  :" + (archiveTotalValidMails + archiveTotalRejectedMails) +
                    // "<br>Total valid mails  :" + archiveTotalValidMails +
                    // "<br>Total rejected mails  :" + archiveTotalRejectedMails +
                    "<br>Total archive size  :" + common.roundToMO(archiveTotalSize) + "MO" +
                    "<br>Total attachments size  :" + common.roundToMO(archiveAttachmentsSize) + "MO"
                if (indexElastic) {
                    return callback(null, {
                        text: "folder(s) indexed in index "+indexElastic ,
                        status: "indexation OK"

                    })
                }

                if (scanOnly) {

                    var status = "okAll";
                    if (archiveTotalSize > imapMailExtractor.archiveMaxSize) {
                        text = "<span class='rejected'><B>Archive exceeds max allowed size ( " + common.roundToMO(imapMailExtractor.archiveMaxSize) + "MO)" + "<br>try  with smaller subfolder  or contact administrator</B></span><br>" + text;
                        status = "ko";
                    } else if (archiveTotalSize + archiveAttachmentsSize > imapMailExtractor.archiveMaxSize) {
                        text = "<span class='rejected'><B>Archive with attachments exceeds max allowed size (" + common.roundToMO(imapMailExtractor.archiveMaxSize) + "MO)" + "<br> you can  process an archive without attachments, or try with smaller subfolder or contact administrator</B></span><br>" + text;
                        status = "okMessagesOnly"
                    }
                    return callback(null, {
                        text: text,
                        status: status

                    })
                }
                var endMessage = "Total mails Processed : " + archiveTotalValidMails + " in " + totalDuration + "sec, preparing zip download, size:" + common.roundToMO(archiveAttachmentsSize) + "MO" + "<br>" + text;

                if (listMails) {
                    fs.writeFileSync(pdfArchiveRootPath + "/mailsList.txt", mailListSb);
                    imapMailExtractor.sendSocketMessage(mailAdress, endMessage)
                    // imapMailExtractor.sendSocketMessage(mailAdress, "<style> body { font-family: Verdana; font-size: 12px;}.rejected { font-style: italic;color: red;}</style>")
                    imapMailExtractor.storeSocketMessage(mailAdress, pdfArchiveRootPath);
                }

                //  console.log(pdfArchiveRootPath)
                imapMailExtractor.sendSocketMessage(mailAdress, "creating  zip archive on server...");

            })


        })

    }
  ,
    extractAttachmentName: function (attachmentInfos) {
        var attachmentName;
        if (attachmentInfos.params && attachmentInfos.params.name)
            return attachmentInfos.params.name
        if (!attachmentInfos.params)
            if (!attachmentInfos.disposition)
                return null;
        if (attachmentInfos.disposition.params && attachmentInfos.disposition.params.name)
            attachmentName = attachmentInfos.disposition.params.name;
        if (!attachmentName && attachmentInfos.disposition.params && attachmentInfos.disposition.params.filename)
            attachmentName = attachmentInfos.disposition.params.filename;
        if (!attachmentName)
            return null;
        //   attachmentName = "attachment_" + Math.round(Math.random() * 100);
        attachmentName = imapMailExtractor.decodeChunk(attachmentName);
        return attachmentName;
    }

    /**
     *
     *
     * @param messageInfos
     * @param attachmentInfos
     * @param pdfArchiveFolderPath if not null creates the attachment folder and return path  otherwise return attachment filename only
     * @returns {*}
     */
    ,
    getAttachmentFileName: function (messageInfos, attachmentInfos, pdfArchiveFolderPath) {
        var attachmentsDir = "";
        if (pdfArchiveFolderPath) {
            attachmentsDir = path.resolve(pdfArchiveFolderPath + "/attachments");
            if (!fs.existsSync(attachmentsDir)) {
                fs.mkdirSync(attachmentsDir);
            }
        }
        var pdfName;
        if (messageInfos.Subject)
            pdfName = messageInfos.Subject;
        else
            pdfName = "mail_sans_sujet_" + Math.round(Math.random() * 1000000);
        pdfName = common.formatStringForArchive(pdfName, mailPdfGeneratorHtml.maxPdfSubjectLength);

        var attachmentName = imapMailExtractor.extractAttachmentName(attachmentInfos);
        //exclusion of logos and small images
        if (imapMailExtractor.attachmentsExcluded.names.indexOf(attachmentName.toLowerCase()) > -1)
            return;
        var p = attachmentName.lastIndexOf('.');
        if (p > -1) {
            var extension = attachmentName.substring(p + 1).toLowerCase();
            if (imapMailExtractor.attachmentsExcluded.extensions.indexOf(attachmentName) > -1)
                if (attachmentInfos.size < imapMailExtractor.attachmentsExcluded.smallerThan)
                    return;
        }
        if (!attachmentName)
            attachmentName = "??";

        attachmentName = mailPdfGeneratorHtml.formatStringForArchive(attachmentName, 300);

        var fileName = pdfName + "__" + attachmentName;
        if (pdfArchiveFolderPath) {


            return path.resolve(attachmentsDir + "/" + fileName);
        } else
            return fileName;


    },
    getAtttachmentNames: function (attachmentInfosArray) {
        var names = [];
        for (var key in attachmentInfosArray) {
            var infos = attachmentInfosArray[key];
            names.push(imapMailExtractor.extractAttachmentName(infos));
        }
        return names;

    }

    ,
    searchMails: function (imapServer, mailAdress, password, box, criteriaArray, callback) {
        var imap = imapMailExtractor.getImapConn(imapServer, mailAdress, password);
        imap.once('ready', function () {
            imap.openBox(box, true, function (err, box) {
                if (err) {
                    console.log(err);
                    return callback1(err)
                }
                imap.seq.search(criteriaArray, function (err, results) {

                    if (results.length == 0)
                        return callback(null, []);
                    var f = imap.seq.fetch(125, {
                        bodies: ['HEADER.FIELDS (TO FROM SUBJECT DATE)', 'TEXT'],
                        struct: true
                    });

                    f.on('message', function (msg, seqno) {

                        var buffer = '';
                        var subject = "";
                        var chunks = [];
                        var textBuffer;
                        var headersBuffer;
                        var infos;
                        msg.on('body', function (stream, info) {
                            var type = info.which;
                            stream.on('data', function (chunk) {
                                    chunks.push(chunk)

                                }
                            );

                            stream.once('end', function () {

                                if (type == 'TEXT')
                                    textBuffer = Buffer.concat(chunks);
                                else
                                    headersBuffer = Buffer.concat(chunks);
                                chunks = [];
                            });

                        });
                        msg.once('attributes', function (attrs) {
                            infos = imapMailExtractor.getPartsInfos(attrs.struct, null, seqno);


                        });
                        msg.once('end', function () {
                            var text = imapMailExtractor.decodeChunk(textBuffer);
                            var headers = imapMailExtractor.parseMessageHeader(imapMailExtractor.decodeChunk(headersBuffer));
                            if (headers.Subject.indexOf("Facturation") > -1)
                                var ccc = 1;
                            var xxx = infos;

                        });


                    });
                    f.once('error', function (err) {
                        console.log('Fetch error: ' + err.message);
                        // return callback1(null);
                    });
                    f.once('end', function () {
                        return callback(null, [])
                        imap.end();
                    });
                });
            });


        })
        imap.once('error', function (err) {
            console.log('Fetch error: ' + err.message);
            //   return callback1(err.message);
        })
        imap.connect();


    },

    initSocketMessage: function (login) {
        if (!clientSocketMessages[login]) {
            clientSocketMessages[login] = "";
        }
    },

    sendSocketMessage: function (login, message, dontStore) {

        if (!dontStore)
            clientSocketMessages[login] = message + "<br>" + clientSocketMessages[login];
        socket.message(message);
    },
    storeSocketMessage: function (login, pdfArchiveRootPath) {
        var journalHtml = clientSocketMessages[login];
        if (!journalHtml || journalHtml == "")
            return;
        mailPdfGeneratorHtml.makeWkhtmlPdf(null, "journal", "Archive journal", journalHtml, function (err, stream) {
            var buffer = new Buffer(256);
            var chunks = [];
            stream.on('data', function (chunk) {
                chunks.push(chunk)


            });
            stream.once('end', function () {
                var str = new Buffer.concat(chunks);
                fs.writeFileSync(pdfArchiveRootPath + "/ArchiveJournal.pdf", str);

                clientSocketMessages[login] = "";
            })
        })

    },

}


module.exports = imapMailExtractor;
