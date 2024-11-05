import fs from 'fs';
import http from 'http';
import ini from 'ini';
import thirtyTwo from 'thirty-two';

const CONFIG_PATH = 'config_path_here';
let config;

// Load configurations from config.ini
function loadConfig() {
    try {
        const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
        config = ini.parse(configContent);

        // Decode AUTHORIZED_KEY using Base32
        if (config.Authorization && config.Authorization.AUTHORIZED_KEY) {
            config.Authorization.AUTHORIZED_KEY = thirtyTwo.decode(config.Authorization.AUTHORIZED_KEY).toString('utf-8');
            console.log('Configuration loaded:', config);
        } else {
            console.log('AUTHORIZED_KEY is missing in config file');
        }
    } catch (error) {
        console.log('Failed to load config file:', error);
    }
}

loadConfig();

const dataFilePath = '/home/henryserver/hosting/data.json'; // Fixed path for JSON file
const PORT = config.Server.HOSTING_PORT || 80;
const AUTHORIZED_KEY = config.Authorization.AUTHORIZED_KEY;

// Base64 decode function (URL decoding included)
function decodeBase64(encodedKey) {
    try {
        const decodedKey = Buffer.from(decodeURIComponent(encodedKey), 'base64').toString('utf-8');
        return decodedKey;
    } catch (error) {
        console.log('Failed to decode Base64 key:', error);
        return null;
    }
}

// Function to read JSON data
function readDataFile(res) {
    try {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('Failed to read JSON data:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error reading data file: ${error.message}`);
        return null;
    }
}

// Function to write JSON data
function writeDataFile(data, res) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('Data successfully written to file');
    } catch (error) {
        console.log('Failed to write JSON data:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error writing data file: ${error.message}`);
    }
}

// Function to format response content
function sendResponse(res, content, isHtml = false) {
    res.writeHead(200, { 'Content-Type': isHtml ? 'text/html' : 'text/plain' });
    res.end(isHtml ? `<html><body><p>${content}</p></body></html>` : content);
}

// Create HTTP server
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const key = url.searchParams.get('key');
    const isHtml = url.searchParams.get('html') === '1';

    // Verify if the URL key decoded in Base64 matches AUTHORIZED_KEY
    if (!key || decodeBase64(key) !== AUTHORIZED_KEY) {
        console.log('Unauthorized access attempt');
        sendResponse(res, 'Unauthorized: Invalid key', isHtml);
        return;
    }

    const command = url.pathname.replace(/^\/+/, '');
    const [action, listName, itemName, value] = command.split('.');

    let data = readDataFile(res);
    if (data === null) return;

    switch (action) {
        case 'write':
            if (listName && itemName) {
                if (!data[listName]) data[listName] = {};
                data[listName][itemName] = value;
            } else {
                data[listName] = value;
            }
            writeDataFile(data, res);
            sendResponse(res, `Data written to ${listName}.${itemName}: ${value}`, isHtml);
            break;

        case 'read':
            if (data[listName]) {
                if (itemName && data[listName][itemName]) {
                    sendResponse(res, data[listName][itemName], isHtml);
                } else if (!itemName) {
                    sendResponse(res, JSON.stringify(data[listName]), isHtml);
                } else {
                    sendResponse(res, 'Item not found', isHtml);
                }
            } else {
                sendResponse(res, 'List not found', isHtml);
            }
            break;

        case 'add':
            if (!data[listName]) data[listName] = {};
            data[listName][itemName] = value;
            writeDataFile(data, res);
            sendResponse(res, `Data added to ${listName}.${itemName}: ${value}`, isHtml);
            break;

        case 'delete':
            if (data[listName]) {
                if (itemName && data[listName][itemName]) {
                    delete data[listName][itemName];
                } else if (!itemName) {
                    delete data[listName];
                } else {
                    sendResponse(res, 'Item not found', isHtml);
                    return;
                }
                writeDataFile(data, res);
                sendResponse(res, `Data deleted from ${listName}.${itemName || 'entire list'}`, isHtml);
            } else {
                sendResponse(res, 'List not found', isHtml);
            }
            break;

        default:
            sendResponse(res, 'Invalid command', isHtml);
            break;
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`HTTP/1.1 server running on port ${PORT}`);
});
