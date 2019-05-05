// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const Request = require('request-promise');

const getPosition = async (query) => {
    try {
        var result = await Request({
            uri: "https://geocoder.api.here.com/6.2/geocode.json",
            qs: {
                "app_id": "XOVnwXBbHfGKDwCKtFWj",
                "app_code": "JQ1QcJpp052_G03SPlA8Ww",
                "searchtext": query
            },
            json: true
        });
        if (result.Response.View.length > 0 && result.Response.View[0].Result.length > 0) {
            return result.Response.View[0].Result[0].Location.DisplayPosition;
        } else {
            throw "No results were returned";
        }
    } catch (error) {
        throw error;
    }
}

const getData = async (dataType) => {
    const police = "https://data.milwaukee.gov/dataset/9982cb76-ea16-46e3-a3f6-206b6c5eacce/resource/6da15469-e832-4ed0-beb2-a4f0ef2a0954/download/police_stations.json";
    const libraries = "https://data.milwaukee.gov/dataset/1b984aba-5cc1-47e3-8c64-999b6d26ceb6/resource/6206e5c7-6bd3-46aa-abcd-9aadd2dad563/download/librarybranches.json";
    const permits = "https://data.milwaukee.gov/dataset/0cc95c94-0414-44b3-a7ee-1d04d297ad26/resource/a1a23338-caba-4fa9-bdce-af05f322581a/download/project.json";

    let address = null;

    switch (dataType) {
        case "library":
            address = libraries;
            break;
        case "police station":
            address = police;
            break;
        case "permits":
            address = permits;
            break;
    }

    console.log("Requesting " + dataType);

    try {
        var result = await Request({
            uri: address,
            json: true
        });

        console.log(JSON.stringify(result));

        return result;
    } catch (error) {
        throw error;
    }
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Welcome, you can say Hello or Help. Which would you like to try?';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};
const PermitIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'PermitIntent';
    },
    async handle(handlerInput) {
        const {
            requestEnvelope,
            serviceClientFactory,
            responseBuilder
        } = handlerInput;

        let projectName = requestEnvelope.request.intent.slots.project.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        let projects = await getData("permits");

        let project = null;

        projects.forEach(element => {
            if (element["Project"] === projectName) {
                project = element;
            }
        });

        let msg;
        let phone = project === null || project["Phone"] === "None" ? "414-286-8210" : project["Phone"];
        if (project === null) {
            msg = "I'm sorry. I couldn't find any information about " + projectName + " permits. Please call the city at " + phone + ".";
        } else if (project["Permit"] === "Yes") {
            msg = "Yes, you do need a permit for " + projectName + ". Please call the city at " + phone + " for more information.";
        } else if (project["Permit"] === "No") {
            msg = "No, you do not need a permit for " + projectName + ". Please call the city at " + phone + " with any further questions.";
        } else {
            msg = "You might need a permit for " + projectName + ". Please call the city at " + phone + " for more information.";
        }

        return handlerInput.responseBuilder
            .speak(msg)
            .withSimpleCard(msg)
            .getResponse();
    }
};
const GovtBuildingIntentHandler = {
    canHandle(handlerInput) {
        const {
            request
        } = handlerInput.requestEnvelope;

        return request.type === 'IntentRequest' && request.intent.name === 'GovtBuildingIntent';
    },
    async handle(handlerInput) {
        const {
            requestEnvelope,
            serviceClientFactory,
            responseBuilder
        } = handlerInput;
        const consentToken = requestEnvelope.context.System.user.permissions &&
            requestEnvelope.context.System.user.permissions.consentToken;

        if (!consentToken) {
            return responseBuilder
                .speak('Please enable Location permissions in the Amazon Alexa app.')
                .withAskForPermissionsConsentCard(['read::alexa:device:all:address'])
                .getResponse();
        }

        try {
            const {
                deviceId
            } = requestEnvelope.context.System.device;
            const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
            const address = await deviceAddressServiceClient.getFullAddress(deviceId);

            let response;
            if (address.addressLine1 === null && address.stateOrRegion === null) {
                response = responseBuilder
                    .speak(`It looks like you don't have an address set. You can set your address from the companion app.`)
                    .getResponse();
            } else {
                let position = await getPosition(address.addressLine1 + " " + address.stateOrRegion + " " + address.postalCode);

                let buildingType = requestEnvelope.request.intent.slots.govt_building.resolutions.resolutionsPerAuthority[0].values[0].value.name;
                let buildings = await getData(buildingType);

                //create distance variable, initiate w/ very large number
                let distance = 1000;
                //create variable to hold library name w/ shortest distance
                let closestBuilding;

                buildings.forEach(element => {
                    //calculate (x1-x2)
                    let distLong = element.Longitude - position.Longitude;
                    //calculate (y1-y2)
                    let distLat = element.Latitude - position.Latitude;

                    //sqrt((xLoc - xLib)^2 +(yLoc - yLib)^2)       
                    let result = Math.sqrt(distLong * distLong + distLat * distLat);

                    //compare result with distance
                    //if result < distance then distance = result
                    if (result < distance) {
                        distance = result;
                        closestBuilding = element;
                    }
                });

                //console.log(JSON.stringify(requestEnvelope));

                let msg = "The closest " + buildingType + " to you is " + closestBuilding["Name"] + " at " + closestBuilding["Address"] + ".";
                let spokenMsg = msg;
                if (buildingType === "library") {
                    spokenMsg += getHours(closestBuilding);
                }

                return handlerInput.responseBuilder
                    .speak(spokenMsg)
                    .withSimpleCard(msg)
                    .getResponse();
            }
            return response;
        } catch (error) {
            if (error.name !== 'ServiceError') {
                console.log(JSON.stringify(error));
                const response = responseBuilder
                    .speak('Uh Oh. Looks like something went wrong.')
                    .getResponse();

                return response;
            }
            throw error;
        }
    }
};

const GeneralIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'GeneralIntent';
    },
    async handle(handlerInput) {
        const {
            requestEnvelope,
            serviceClientFactory,
            responseBuilder
        } = handlerInput;

        let msg = "The phone number for the city of Milwaukee is (414)-286-CITY."

        return handlerInput.responseBuilder
            .speak(msg)
            .withSimpleCard(msg)
            .getResponse();
    }
};

function getHours(closestBuilding) {
    let mkeTime = new Date().toLocaleString("en-US", {
        timeZone: "America/Chicago"
    });
    mkeTime = new Date(mkeTime);
    console.log('USA time: ' + mkeTime.toLocaleString());

    let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let dayIndex = mkeTime.getDay();

    let closedTime = closestBuilding[days[dayIndex]][1];
    let closedHour = parseInt(closedTime) + (closedTime.indexOf("PM") === -1 ? 0 : 12);
    let currentlyClosed = closedTime === "Closed" || closedHour < mkeTime.getHours();

    if (!currentlyClosed) {
        return " Its hours are " + closestBuilding[days[dayIndex]][0] + " to " + closestBuilding[days[dayIndex]][1] + ".";
    }

    let msg = " This location is currently closed. It will reopen on ";
    do {
        dayIndex = dayIndex === days.length - 1 ? 0 : dayIndex + 1;
        closedTime = closestBuilding[days[dayIndex]][1];
        currentlyClosed = closedTime === "Closed";
    } while (currentlyClosed);
    msg += days[dayIndex] + " at " + closestBuilding[days[dayIndex]][0] + ".";

    return msg;
}


const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = handlerInput.requestEnvelope.request.intent.name;
        const speechText = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speechText)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.message}`);
        const speechText = `Sorry, I couldn't understand what you said. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        PermitIntentHandler,
        GovtBuildingIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    .withApiClient(new Alexa.DefaultApiClient())
    .addErrorHandlers(
        ErrorHandler)
    .lambda();
