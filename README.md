# ask-milwaukee
City of Milwaukee Alexa Skill

Our stack uses Amazon's [Alexa Voice Service](https://developer.amazon.com/alexa-voice-service) with server-less [AWS Lambda](https://aws.amazon.com/lambda/) calls built into it. We use [Node.js](https://nodejs.org/en/) for our Lambda functions. Our Lambda functions point to [Milwaukee's Open Data Portal](https://data.milwaukee.gov/).

Our Alexa skill is currently [Far-Field and Hands-Free](#https://developer.amazon.com/alexa-voice-service/design) activated only. The End-user wakes the device with 'Alexa". Alexa will start listening for a key words and phrases. Alexa knows to use [Alexa Skills](https://www.amazon.com/alexa-skills/b?ie=UTF8&node=13727921011) (Alexa apps) by listening for 'Skill' keywords. 
 

Our Skill is named "[City of Milwaukee](#F5BF00)". `"Alexa, ask City of Milwaukee"`, will trigger the activation of our application on Alexa.
 

As a test we're creating a simple voice command to ask where the closest library is based the Alexa device's location. Instead of relying on Google Map's data, which may be out of date, we are going to hit the Milwaukee Government Open Data API. 

`"Alexa, ask City of Milwaukee where is the closest library?"`,
 
There is a simple data set in [Milwaukee's Open Data Portal](https://data.milwaukee.gov/organization/hack-a-pipeline) that returns a JSON of all of Milwaukee Public Library Branches. It holds operating hours, location, and contact information.

Our Alexa app will parse the voice for key words.
