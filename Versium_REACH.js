import fetch from "node-fetch";
/**
 * This function should be used to effectively query Versium REACH APIs. See our API Documentation for more information
 * https://api-documentation.versium.com/reference/welcome
 *
 * @param  array  $inputData
 * inputData is an array of objects where the keys are the headers and the values are the values corresponding to each header
 * ex. inputData = [{first: "someFirstName", last: "someLastName", email: "someEmailAddress"}];
 * @param  array  outputTypes
 * This array should contain a list of strings where each string is a desired output type. This parameter is optional if the API you are using does not require output types
 * ex. [] or ["email", "phone"]
 * @param  string apiKey
 * @param  string dataTool
 * the current options for dataTool are: contact, demographic, b2cOnlineAudience, b2bOnlineAudience, firmographic, c2b, iptodomain, hemtobusinessdomain
 * @return Promise
 * When the promise resolves, it will be an array of objects
 */
async function append(inputData, outputTypes, apiKey, dataTool) {
    let results = new Array();
    let baseURL = `https://api.versium.com/v2/${dataTool}?`;
    let urls = Array(inputData.length).fill("");
    if (outputTypes.length > 0) {
        outputTypes.forEach(outputType => {
            baseURL += `output[]=${outputType}&`;
        });
    }
    const options = {
        headers: {
            "Accept": "application/json",
            "x-versium-api-key": apiKey,
        }
    };
    if (inputData.length > 0) {
        inputData.forEach((row, index) => {
            const inputParams = new URLSearchParams(row).toString();
            urls[index] = baseURL + inputParams;
        });
    } else {
        throw Error("You have no input data");
    }

    const batchSize = 3; //max batchSize to avoid running into the rate limit
    let curReq = 0;
    while (curReq < urls.length) {
        const end = urls.length < curReq + batchSize ? urls.length : curReq + batchSize;
        const concurrentReq = new Array();
        for (let index = curReq; index < end; index++) {
            concurrentReq.push(fetch(urls[curReq], options).then((resp) => resp.json()).then((jsonResp) => jsonResp.versium.results));

            console.log(`sending request ${curReq}...`)
            curReq++;
        }
        const batchResp = await Promise.all(concurrentReq);
        batchResp.forEach((resp) => {
            results = [...results, resp];
        });
        console.log(`requests ${curReq - batchSize}-${curReq} done.`);
    }

    return results;
}

//USE THIS METHOD FOR TESTING, DELETE IT BEFORE PUBLISHING THE REPO
//uncomment/change the code block according to the api you want to use, then run the program
async function testMethod() {
    //c2b test data
    // const testInputData = Array(135).fill({ first: "Angela", last: "Adams", email: "adamsangela@hotmail.com" });
    // const testOutputTypes = [];
    // const testApiKey = '';
    // const testDataTool = 'c2b';

    //iptodomain test data
    // const testInputData = Array(97).fill({ ip: "152.44.212.248" });
    // const testOutputTypes = [];
    // const testApiKey = '';
    // const testDataTool = 'iptodomain';

    //contact append test data
    // const testInputData = Array(101).fill({ email: "adamsangela@hotmail.com" });
    // const testOutputTypes = ["address", "phone"];
    // const testApiKey = '';
    // const testDataTool = 'contact';

    //demographic test data
    // const testInputData = Array(88).fill({ email: "adamsangela@hotmail.com" });
    // const testOutputTypes = ["lifestyle", "political"];
    // const testApiKey = '';
    // const testDataTool = 'demographic';

    //b2cOnlineAudience test data
    // const testInputData = Array(95).fill({ first: "Marc", last: "Blythe", email: "marc@blytheglobal.com" });
    // const testOutputTypes = [];
    // const testApiKey = '';
    // const testDataTool = 'b2cOnlineAudience';

    //b2bOnlineAudience test data
    // const testInputData = Array(95).fill({ first: "Marc", last: "Blythe", email: "marc@blytheglobal.com" });
    // const testOutputTypes = [];
    // const testApiKey = '';
    // const testDataTool = 'b2bOnlineAudience';

    //firmographic test data
    // const testInputData = Array(87).fill({ email: "marc@blytheglobal.com" });
    // const testOutputTypes = [];
    // const testApiKey = '';
    // const testDataTool = 'firmographic';

    //hemtobusinessdomain test data
    // const testInputData = Array(5).fill({ email: "a3bf653e8393decc6cde18e15c4469fc" });
    // const testOutputTypes = [];
    // const testApiKey = '';
    // const testDataTool = 'hemtobusinessdomain';

    const responses = await append(testInputData, testOutputTypes, testApiKey, testDataTool);
    responses.forEach((resp, index) => {
        console.log('---------RESPONSE ' + index + ' STARTS HERE---------')
        console.log(resp);
    });
}
testMethod();
