/**
 * Created by claud on 09/05/2017.
 */
var ml = require('machine_learning');
var algorithms={

    testKnn:function() {

        var ml = require('machine_learning');

        var data = [[1,0,1,0,1,1,1,0,0,0,0,0,1,0],
            [1,1,1,1,1,1,1,0,0,0,0,0,1,0],
            [1,1,1,0,1,1,1,0,1,0,0,0,1,0],
            [1,0,1,1,1,1,1,1,0,0,0,0,1,0],
            [1,1,1,1,1,1,1,0,0,0,0,0,1,1],
            [0,0,1,0,0,1,0,0,1,0,1,1,1,0],
            [0,0,0,0,0,0,1,1,1,0,1,1,1,0],
            [0,0,0,0,0,1,1,1,0,1,0,1,1,0],
            [0,0,1,0,1,0,1,1,1,1,0,1,1,1],
            [0,0,0,0,0,0,1,1,1,1,1,1,1,1],
            [1,0,1,0,0,1,1,1,1,1,0,0,1,0]
        ];

        var result = ml.kmeans.cluster({
            data : data,
            k : 4,
            epochs: 100,

            distance : {type : "pearson"}
            // default : {type : 'euclidean'}
            // {type : 'pearson'}
            // Or you can use your own distance function
            // distance : function(vecx, vecy) {return Math.abs(dot(vecx,vecy));}
        });

        console.log("clusters : ", result.clusters);
        console.log("means : ", result.means);
}

}
module.exports=algorithms

algorithms.testKnn();
