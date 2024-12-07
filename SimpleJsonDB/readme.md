# Node.js Web Server with Configuration Management

This project is a Node.js-based HTTP server that manages configurations using an `.ini` file and implements base64 URL authentication.

## Features
- **Configuration Management**: Configurations are stored and loaded from a `.ini` file.
- **Authorization**: Base32-encoded authorization key in `config.ini` is validated against a URL-provided base64 key.
- **CRUD Operations**: Supports read, write, add, and delete operations on structured data, with JSON data storage.

## Setup and Installation
1. **Clone the repository**:
    ```bash
    git clone https://github.com/lunaflies/YOUR_REPOSITORY.git
    cd YOUR_REPOSITORY
    ```

2. **Install Dependencies**:
    ```bash
    npm install
    ```

3. **Set Up Configurations**:
    Create a `config.ini` file in the root directory with the following structure:
    ```ini
    [Server]
    HOSTING_PORT = 80
    SERVER_ROOT_FOLDER = /home/henryserver/hosting

    [Authorization]
    AUTHORIZED_KEY = YOUR_BASE32_ENCODED_KEY

    [Settings]
    JSON_AUTO_SAVE_ENABLED = true
    AUTO_SAVE_INTERVAL = 240
    ```

4. **Run the Server**:
    ```bash
    node /home/henryserver/hosting/webserver.mjs
    ```

## Usage
- **Authorization**:
  Encode the `AUTHORIZED_KEY` in base64 and include it in requests as a `key` query parameter.

- **Endpoints**:
  - `write.listName.itemName.value`
  - `read.listName.itemName`
  - `add.listName.itemName.value`
  - `delete.listName.itemName`

## Troubleshooting
- Ensure that the correct path is set in the `config.ini` file.
- Verify base64 and base32 key encoding requirements.

## License
This project is licensed under the MIT License.
