import * as functions from "firebase-functions";
import Express from 'express';
import fs from 'fs';
import cors from 'cors'
import path from 'path'
import os from 'os'
import Busboy from 'busboy'
import request from 'request'

const { create } = require('ipfs-http-client')

// Don't move peerID to .env
// const peerID = 'XTCFIL231021IPFS-4566A8975F1135XB468'; // Secret-Key (Expires in 3 Days)

const app = Express();
// express session
app.set('trust proxy', 1) // trust first proxy

app.use(cors());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));


const ipfs = create({
    url: 'https://ipfs.infura.io:5001/api/v0'
})


/**
 * Function to serve the index.html to manage the contracts
 */
app.get('/manage/', function (req, res) {
    res.sendFile('manage.html', { root: path.resolve('.', 'public') });
})

/**
 * Function to receive the tenant_id, owner_id and contract file and push it to ipfs
 */
app.post('/new/', async (req, res, next) => {
    try {
        const data=await extractMultipartFormData(req);
        const tenant_id = data.fields.tenant_id;
        const owner_id = data.fields.owner_id;
        const contract_file = data.uploads.contract;
        if (!tenant_id) throw Error("Tenant Id is required")
        if (!owner_id) throw Error("Owner Id is required")
        if (!contract_file) throw Error("contract_file is required")

        const apiRes = await ipfs.add(contract_file);
        res.send(apiRes);
    } catch (err) {
        res.send({
            error: true,
            message: err['message'] as unknown as string
        });
    }
})

/**
 * Proxying the file data
 */
app.get('/view/:ID', async (req, res) => {
    const url=`https://ipfs.io/ipfs/${req.params.ID}`;
    request.get(url).pipe(res);
})


/**
 * Custom parser to parse the form data uploads and fields
 * credits: https://stackoverflow.com/a/63379675/10456639
 */
function extractMultipartFormData(req:any) : Promise<{uploads: any,fields: any}> {
    return new Promise((resolve, reject) => {
        if (req.method != 'POST') {
            return reject(405);
        } else {
            const busboy = new Busboy({ headers: req.headers });
            const tmpdir = os.tmpdir();
            const fields:any = {};
            const fileWrites:any = [];
            const uploads:any = {};

            busboy.on('field', (fieldname, val) => (fields[fieldname] = val));

            busboy.on('file', (fieldname, file, filename) => {
                const filepath = path.join(tmpdir, filename);
                const writeStream = fs.createWriteStream(filepath);

                uploads[fieldname] = filepath;

                file.pipe(writeStream);

                const promise = new Promise((resolve, reject) => {
                    file.on('end', () => {
                        writeStream.end();
                    });
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });

                fileWrites.push(promise);
            });

            busboy.on('finish', async () => {
                const result:any = { fields, uploads: {} };

                await Promise.all(fileWrites);

                for (const file in uploads) {
                    const filename = uploads[file];

                    result.uploads[file] = fs.readFileSync(filename);
                    fs.unlinkSync(filename);
                }

                resolve(result);
            });

            busboy.on('error', reject);

            if (req.rawBody) {
                busboy.end(req.rawBody);
            } else {
                req.pipe(busboy);
            }
        }
    });
};

export const contractApi = functions.https.onRequest(app);

