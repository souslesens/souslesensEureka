var appConfig = {
    appName: "search",
    loginMode: "database",  //database or none
    contentField: "attachment.content",
    locale: "Fr",
    elasticUrl: "./elastic",

}


appConfig.hitsEntitiesQuery = {
    "_source": {},
    from: 0,
    size: 5000,
    "query":
        {
            "terms": {
                "data.documents.id": []
            }
        }
}


appConfig.elasticQuery = {
    from: 0,
    size: 25,
    indexes: [],
    source: {"excludes": [appConfig.contentField]},
    highlight: {
        tags_schema: "styled",
        number_of_fragments: 3,
        fragment_size: 150,
        fields: {
            [appConfig.contentField]: {},

        }
    }

}

appConfig.photos={
    indexPhotosDirsMap:{
        versements:"polytheque",
        artotheque:"artotheque",
        arts:"artotheque",
        photos:"phototheque"
    },
 maxPhotosInFotorama:100,
    //versementsPath:"smb://serveur.local/serveur/Equipe/Pole_Archives/01-Instruments_de_RECHERCHE/1107-INT-PAEFI-1970_2018.odt",


}
appConfig.dictionary={
    support:{

            "ACC_":"Argentique + CD (couleur)",
            "ADB_":"Argentique Diapo N&B",
            "ADC_":"Argentique Diapo couleur",
            "ADM_":"Argentique Diapo multiple",
            "ANB_":"Argentique Négatif N&B",
            "ANC_":"Argentique Négatif couleur",
            "ANM_":"Argentique Négatif multiple",
            "ASC_":"Argentique Scanné (couleur)",
            "ASN_":"Argentique Scanné (N&B)",
            "ATB_":"Argentique Tirage N&B",
            "ATC_":"Argentique Tirage couleur",
            "ATM_":"Argentique Tirage multiple",
            "NCD_":"Numérique CD",
            "NPC_":"Numérique Photo Camera",
            "NCA_":"Numérique CD Argentique (FNAC)",
            "OPA_":"Oeuvre Photo Album",
            "OPE_":"Oeuvre Photo Exposition",
            "ODS_":"Oeuvre Divers Supports"

        }




}
