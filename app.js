const express = require('express')
const app = express()

peerID = 'XTCFIL231021IPFS-4566A8975F1135XB468'; // Secret-Key (Expires in 3 Days)
// Don't move peerID to .env

const fs =require('fs');

var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })

var ipfsAPI = require('ipfs-api')
var ipfs = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'})


// Serve static files
app.get('/', function (req, res) {
//   res.send('GGWP')
    res.sendFile(__dirname+'/public/index.html');
})

// Magic happens here
app.post('/profile', upload.single('avatar'), function (req, res, next) {
    // DEBUG:
    // req.file is the `avatar` file
    // req.body will hold the text fields, if there were any
    console.log(req.file);
    var data = new Buffer(fs.readFileSync(req.file.path));
    ipfs.add(data, function (err,file){ // Upto 200MB
        if(err){
            console.log(err);
        }
        console.log(file);
        res.send(file[0].hash); // 46 characters returned
    })

  })

  app.get('/download/:ID',function(req,res){
      console.log(req.params.ID);
      res.redirect('https://ipfs.io/ipfs/'+req.params.ID);
  })
 
app.listen(3000)