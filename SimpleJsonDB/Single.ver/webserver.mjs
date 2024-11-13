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
        try {
            if (config.Authorization && config.Authorization.AUTHORIZED_KEY) {
                config.Authorization.AUTHORIZED_KEY = thirtyTwo.decode(config.Authorization.AUTHORIZED_KEY).toString('utf-8');
                console.log('Configuration loaded:', config);
            } else {
                console.error('AUTHORIZED_KEY is missing in config file');
            }
        } catch (error) {
            console.error('Failed to decode AUTHORIZED_KEY:', error.message);
        }
    } catch (error) {
        console.error('Failed to load config file:', error.message);
    }
}

loadConfig();

const dataFilePath = '/home/henryserver/hosting/data.json'; // Fixed path for JSON file
const PORT = config?.Server?.HOSTING_PORT || 80;
const AUTHORIZED_KEY = config?.Authorization?.AUTHORIZED_KEY || '';

// Base64 decode function (URL decoding included)
function decodeBase64(encodedKey) {
    try {
        return Buffer.from(decodeURIComponent(encodedKey), 'base64').toString('utf-8');
    } catch (error) {
        console.error('Failed to decode Base64 key:', error.message);
        return null;
    }
}

// Function to read JSON data
function readDataFile(res) {
    try {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to read JSON data:', error.message);
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
        console.error('Failed to write JSON data:', error.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error writing data file: ${error.message}`);
    }
}

// Function to format response content
function sendResponse(res, content, isHtml = false) {
    try {
        res.writeHead(200, { 'Content-Type': isHtml ? 'text/html' : 'text/plain' });
        res.end(isHtml ? `<html><body><p>${content}</p></body></html>` : content);
    } catch (error) {
        console.error('Failed to send response:', error.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error sending response: ${error.message}`);
    }
}

// Create HTTP server
const server = http.createServer((req, res) => {
    try {
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
                try {
                    if (listName && itemName) {
                        if (!data[listName]) data[listName] = {};
                        data[listName][itemName] = value;
                    } else if (listName) {
                        data[listName] = value;
                    }
                    writeDataFile(data, res);
                    sendResponse(res, `Data written to ${listName}.${itemName || ''}: ${value}`, isHtml);
                } catch (error) {
                    console.error('Error in write operation:', error.message);
                    sendResponse(res, 'Error in write operation', isHtml);
                }
                break;

            case 'read':
                try {
                    if (data[listName]) {
                        if (itemName && data[listName][itemName] !== undefined) {
                            sendResponse(res, data[listName][itemName], isHtml);
                        } else if (!itemName) {
                            sendResponse(res, JSON.stringify(data[listName]), isHtml);
                        } else {
                            sendResponse(res, 'Item not found', isHtml);
                        }
                    } else {
                        sendResponse(res, 'List not found', isHtml);
                    }
                } catch (error) {
                    console.error('Error in read operation:', error.message);
                    sendResponse(res, 'Error in read operation', isHtml);
                }
                break;

            case 'add':
                try {
                    if (!data[listName]) data[listName] = {};
                    data[listName][itemName] = value;
                    writeDataFile(data, res);
                    sendResponse(res, `Data added to ${listName}.${itemName}: ${value}`, isHtml);
                } catch (error) {
                    console.error('Error in add operation:', error.message);
                    sendResponse(res, 'Error in add operation', isHtml);
                }
                break;

            case 'delete':
                try {
                    if (data[listName]) {
                        if (itemName && data[listName][itemName] !== undefined) {
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
                } catch (error) {
                    console.error('Error in delete operation:', error.message);
                    sendResponse(res, 'Error in delete operation', isHtml);
                }
                break;

            default:
                sendResponse(res, 'Invalid command', isHtml);
                break;
        }
    } catch (error) {
        console.error('Server error:', error.message);
        sendResponse(res, 'Server error', false);
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`HTTP/1.1 server running on port ${PORT}`);
});
