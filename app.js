var express = require('express');
var app = express();

var port = process.env.PORT || 3000;
app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/people/:personId', function (req, res){
    var neo4j = require('neo4j-driver').v1;

    var driver = neo4j.driver(process.env.GRAPHENEDB_BOLT_URL, neo4j.auth.basic(process.env.GRAPHENEDB_BOLT_USER, process.env.GRAPHENEDB_BOLT_PASSWORD));
    var session = driver.session();
    session
      .run( "MATCH(a:PERSON {personId:" + req.params.personId + "}) RETURN a" )
      .then( function(result){
        res.write("<html><body>");
        return result;
      })
      .then( function( result ) {
        var results = result.records[0].get("a");

        res.write("<div><h1>" + results.properties.name + "</h1></div>" +
        "<div>"+ results.properties.born + "-" + results.properties.died + "</div>" +
        "<div>House: " + results.properties.house + "</div>");
      })
      .then(function(){
        res.write("<div><h1>Parents</h1>");

        session
          .run("MATCH (x)-[r:PARENT_OF]->(a:PERSON {personId:" + req.params.personId + "}) RETURN x" )
          .subscribe({
            onNext: function(record) {
                res.write("<div><a href="+record.get("x").properties.personId+">"+record.get("x").properties.name+"</a></div>")
            },
            onCompleted: function() {
                res.write("</div>");

                res.write("<div><h1>Spouse(s)</h1>");
                session
                  .run("MATCH (a:PERSON {personId:" + req.params.personId + "})-[r:MARRIED]-(x) RETURN x,r" )
                  .subscribe({
                    onNext: function(record) {
                        res.write("<div><a href="+record.get("x").properties.personId+">"+record.get("x").properties.name+" ("+record.get("x").properties.born+"-"+record.get("x").properties.died+")</a> Married in " + record.get("r").properties.start_date + "</div>")
                    },
                    onCompleted: function() {
                        res.write("</div>");


                        res.write("<div><h1>Children</h1>");

                        session
                          .run("MATCH (a:PERSON {personId:" + req.params.personId + "})-[r:PARENT_OF]->(x) RETURN x" )
                          .subscribe({
                            onNext: function(record) {
                                res.write("<div><a href="+record.get("x").properties.personId+">"+record.get("x").properties.name+" ("+record.get("x").properties.born+"-"+record.get("x").properties.died+")</a></div>")
                            },
                            onCompleted: function() {
                                console.log("Done.");
                                res.write("</div>");
                                res.end();
                            }
                          })
                    }
                })
            }
        })
    })
});

app.listen(port, function () {
  console.log('Example app listening on port ' + port + '!');
});
