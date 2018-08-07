const cloudRegion = 'us-central1'; //change region if required
const projectId = ''; //add project ID here
const serviceAccount = {} //include JSON from service account
//const serviceAccount=process.env.GOOGLE_APPLICATION_CREDENTIALS;
var requestID;
const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';
var registryId = "";
const fs = require('fs');
const google = require('googleapis');

// List all of the registries in the given project.
function listRegistries(client, projectId, cloudRegion, callback) {
    const parentName = `projects/${projectId}/locations/${cloudRegion}`;

    const request = {
        parent: parentName
    };

    client.projects.locations.registries.list(request, (err, data) => {
        if (err) {
            console.log('Could not list registries');
            console.log(err);
        } else {
            registryId = data['deviceRegistries'][0].id;
            console.log('Considered registry in project:', registryId);
            callback();
        }
    });
}
//List all of the devices in the given registry.
function listDevices(client, registryId, projectId, cloudRegion, callback) {
    const parentName = `projects/${projectId}/locations/${cloudRegion}`;
    const registryName = `${parentName}/registries/${registryId}`;

    const request = {
        parent: registryName
    };

    client.projects.locations.registries.devices.list(request, (err, data) => {
        if (err) {
            console.log('Could not list devices');
            console.log(err);
        } else {
            console.log('Current devices in registry:', data['devices']);
            callback(data['devices']);
        }
    });
}

//Retrieve the given device from the registry.
function getDevice(client, devices, registryId, projectId, cloudRegion, callback) {
    const parentName = `projects/${projectId}/locations/${cloudRegion}`;
    const registryName = `${parentName}/registries/${registryId}`;

    var devData = [];

    for (i = 0; i < devices.length; i++) { //get all device infos
        const request = {
            name: `${registryName}/devices/${devices[i].id}`
        };

        client.projects.locations.registries.devices.get(request, (err, data) => {
            if (err) {
                // console.log('Could not find device:', devices[i].id);
                console.log(err);
            } else {
                // console.log('Found device:', devices[i].id);
                //    console.log(data);
                devData.push(data);
                devData = JSON.parse(JSON.stringify(devData)); //deepcopy

                if (devData.length == devices.length) { //callback when all devices are available.
                    console.log(devData)
                    callback(devData);
                }
            }
        });
    }
}

//Returns an authorized API client by discovering the Cloud IoT Core API with
// the provided API key.
function getClient(cb) {
    //const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountJson));

    const jwtAccess = new google.auth.JWT();
    jwtAccess.fromJSON(serviceAccount);
    // Note that if you require additional scopes, they should be specified as a
    // string, separated by spaces.
    jwtAccess.scopes = 'https://www.googleapis.com/auth/cloud-platform';
    // Set the default authentication to the above JWT access.
    google.options({ auth: jwtAccess });

    const discoveryUrl = `${DISCOVERY_API}?version=${API_VERSION}`;

    google.discoverAPI(discoveryUrl, {}, (err, client) => {
        if (err) {
            console.log('Error during API discovery', err);
            return undefined;
        }
        cb(client);
    });
}
// Send configuration data to device.
function setDeviceConfig(
    client,
    devices,
    projectId,
    cloudRegion,
    data,
    version,
    callback
) {
    const parentName = `projects/${projectId}/locations/${cloudRegion}`;

    const binaryData = Buffer.from(data).toString('base64');

    var callbackCount = 0;

    for (i = 0; i < devices.length; i++) {
        const registryName = `${parentName}/registries/${devices[i].customData.registry}`;
        deviceId = devices[i].id;
        const request = {
            name: `${registryName}/devices/${deviceId}`,
            versionToUpdate: version,
            binaryData: binaryData
        };

        console.log('setting config for : ',request.name);
        client.projects.locations.registries.devices.modifyCloudToDeviceConfig(request,
            (err, data) => {
                callbackCount++;
                if (err) {
                    console.log('Could not update config:', deviceId);
                    console.log('Message: ', err);
                } else {
                    console.log('Success :', data);
                }
                if (callbackCount == devices.length) {//got all callbacks
                    callback(true); //blindy sending success irrespective of looking at actual data.
                }
            });
    }
    // [END iot_set_device_config]
}

function generateMessageID() {
    return requestID;
    // return 'VnlzYWtoIFAgUGlsbGFp'; // Dummy
}

function handleSync(res) {
    //log('DEBUG', `Sync Request: ${JSON.stringify(request)}`);

    //Get User information using Oauth2 Token

    //Auth token is part of Authorization header sent to the API. To get it here, 
    //    create an input mapping with passthrough in the API console

    var response = {
        requestId: generateMessageID(),
        payload: {
            "agentUserId": "VnlzYWtoIFAgUGlsbGFp",
            devices: []
        }
    }

    getDevicesFromPartnerCloud(response, res);
}

function getDevicesFromPartnerCloud(response, res) {
    //process device metadata
    function processDeviceData(devDataArray) {
        response = {
            "requestId": requestID,
            "payload": {
                "agentUserId": "VnlzYWtoIFAgUGlsbGFp",
                "devices": []
            }
        };

        deviceTemplate = {
            "type": "action.devices.types.LIGHT",
            "traits": ["action.devices.traits.OnOff"],
            "name": { "name": "" },
            "willReportState": false,
            "deviceInfo": {
                "manufacturer": "Microchip Technologies"
            },
            "customData": {
                "registry": registryId
            }
        }

        var i;
        for (i = 0; i < devDataArray.length; i++) {
            //fill unique device ID
            devData = devDataArray[i];

            deviceTemplate.id = devData.id;
            if (devData.metadata.name) {
                deviceTemplate.name.name = devData.metadata.name;
                console.log("deviceName: " + devData.metadata.name);
            }
            else {
                deviceTemplate.name.name = devData.id;
                console.log("we will call him " + devData.id);
            }
            if (devData.metadata.type) {
                console.log("deviceName: " + devData.metadata.type);
            }
            response.payload.devices.push(deviceTemplate);
            //deepcopy response
            response = JSON.parse(JSON.stringify(response));
        }
        console.log(JSON.stringify(response));
        res.status(200).send(response);

    }

    //getDevice from cloud
    function processDevice(devices) {
        const getDeviceCb = function (client) {
            getDevice(
                client,
                devices, 
                registryId,
                projectId,
                cloudRegion,
                processDeviceData
            );
        };
        getClient(getDeviceCb);
    }

    function deviceList() {
        //get a lsit of devices in the first registry
        const deviceListCb = function (client) {
            listDevices(client,
                registryId,
                projectId,
                cloudRegion,
                processDevice);
        };
        getClient(deviceListCb);
    }

    //get first registery in the project
    const registryIdCb = function (client) {
        listRegistries(client,
            projectId,
            cloudRegion,
            deviceList); //device listing callback
    };
    getClient(registryIdCb);

}

function handleExec(payload, res) {

    function sendResponse(status) {
        var execResponse = {
            "requestId": requestID,
            "payload": {
                "commands": [{
                    "status": "SUCCESS", //currently sending blanket success
                    "states": {
                        "on": payload.commands[0].execution[0].params.on,
                        "online": true
                    }
                }]
            }
        }
        execResponse.payload.commands[0].ids=[];

        for(i=0;i<payload.commands[0].devices.length;i++){
            execResponse.payload.commands[0].ids.push(payload.commands[0].devices[i].id);
        }
        
        console.log(JSON.stringify(execResponse));
        res.status(200).send(execResponse);
    }

    //set device configuration
    const setDeviceConfigCb = function (client) {
        var command = "";
        if ("action.devices.commands.OnOff" == payload.commands[0].execution[0].command) {
            if (true == payload.commands[0].execution[0].params.on) command = "LEDOn"
            else if (false == payload.commands[0].execution[0].params.on) command = "LEDOff"
        }
        setDeviceConfig(
            client,
            payload.commands[0].devices,
            projectId,
            cloudRegion,
            command,
            0,
            sendResponse
        );
    };
    getClient(setDeviceConfigCb);
}

function handleQuery(payload, res) {
    var deviceID = payload.devices[0].id;
    var deviceID = payload.devices[0].id;
    var queryResponse = {
        "requestId": requestID,
        "payload": {
            "devices": {
            }
        }
    }
    queryResponse.payload.devices[deviceID] = {
        "on": true,
        "online": true
    };
    console.log(JSON.stringify(queryResponse));
    res.status(200).send(queryResponse);
}
exports.helloWorld = (req, res) => {
    console.log(JSON.stringify(req.body));
    intent = req.body.inputs[0].intent;
    requestID = req.body.requestId;
    switch (intent) {
        case "action.devices.SYNC":
            console.error("SYNC called");
            handleSync(res);
            break;
        case "action.devices.QUERY":
            console.error("QUERY called");
            handleQuery(req.body.inputs[0].payload, res);
            break;
        case "action.devices.EXECUTE":
            console.error("EXEC called");
            console.log(req.body.inputs[0].payload);
            handleExec(req.body.inputs[0].payload, res);
            break;
    }
    //res.status(200).send("helloWorld")
};
